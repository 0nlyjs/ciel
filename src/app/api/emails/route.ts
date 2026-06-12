import { CorsairClient } from "@/lib/corsair";
import { NextResponse } from "next/server";
import { dbInit, query } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getEmbedding, formatVector } from "@/lib/embeddings";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

function runKeywordFallback(subject: string, body: string) {
  const content = `${subject} ${body}`.toLowerCase();
  let priority: "high" | "medium" | "low" = "medium";
  let category: "work" | "personal" | "updates" | "promotions" = "work";

  if (
    content.includes("urgent") ||
    content.includes("immediate action") ||
    content.includes("security alert") ||
    content.includes("important") ||
    content.includes("pitch")
  ) {
    priority = "high";
  } else if (
    content.includes("newsletter") ||
    content.includes("unsubscribe") ||
    content.includes("promotion")
  ) {
    priority = "low";
    category = "promotions";
  }

  if (content.includes("meeting") || content.includes("calendar") || content.includes("schedule")) {
    category = "updates";
  }

  return { priority, category };
}

async function classifyEmail(
  subject: string,
  body: string
): Promise<{ priority: "high" | "medium" | "low"; category: "work" | "personal" | "updates" | "promotions" }> {
  const client = getOpenAIClient();
  if (!client) {
    return runKeywordFallback(subject, body);
  }

  try {
    const prompt = `Classify the following email by priority ("high", "medium", or "low") and category ("work", "personal", "updates", or "promotions").
Subject: ${subject}
Body: ${body}

Respond with a raw JSON object containing exactly two keys: "priority" and "category". Do not wrap in markdown code blocks.`;

    const { text } = await generateText({
      model: client("gpt-4o-mini"),
      prompt,
    });

    const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    return {
      priority: parsed.priority || "medium",
      category: parsed.category || "work",
    };
  } catch (error) {
    console.error("[Classifier] Error during OpenAI classification, falling back:", error);
    return runKeywordFallback(subject, body);
  }
}

// GET /api/emails - Fetch all cached emails from database
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const url = new URL(req.url);
    const forceSync = url.searchParams.get("sync") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    if (forceSync) {
      console.log(`[Emails API] Force sync requested for ${session.user.email}. Clearing cache...`);
      await query("DELETE FROM emails WHERE user_email = $1", [session.user.email]);
    }

    // Sync from Corsair if local DB is empty or forceSync is true
    const checkRes = await query("SELECT count(*)::int as count FROM emails WHERE user_email = $1", [session.user.email]);
    const count = checkRes.rows[0]?.count || 0;

    console.log(`[Emails API] Current DB email count for ${session.user.email}: ${count}`);

    if (count === 0 || forceSync) {
      console.log(`[Emails API] Syncing from Corsair Gmail for ${session.user.email}...`);
      try {
        const messageSkeletons = await CorsairClient.listGmailMessagesDirectly(session.user.email, 100);
        console.log(`[Emails API] Corsair returned ${messageSkeletons.length} message skeletons.`);

        if (messageSkeletons.length > 0) {
          // Fetch existing email IDs to avoid duplicates
          const existingRes = await query("SELECT id FROM emails WHERE user_email = $1", [session.user.email]);
          const existingIds = new Set(existingRes.rows.map((r: any) => r.id));

          const missingSkeletons = messageSkeletons.filter((msg) => !existingIds.has(msg.id));
          console.log(`[Emails API] Found ${missingSkeletons.length} missing emails to fetch.`);

          // Limit to maximum 50 new emails fetched in a single sync to avoid timeout
          const batchToFetch = missingSkeletons.slice(0, 50);
          console.log(`[Emails API] Fetching details for ${batchToFetch.length} new emails...`);

          // Process in chunks of 5 parallel requests
          for (let i = 0; i < batchToFetch.length; i += 5) {
            const chunk = batchToFetch.slice(i, i + 5);
            await Promise.all(chunk.map(async (skeleton) => {
              try {
                const rawMsg = await CorsairClient.getGmailMessageDirectly(skeleton.id, session.user.email);
                if (rawMsg) {
                  const email = CorsairClient.parseGmailMessage(rawMsg);
                  if (email) {
                    const emailId = email.id;
                    const fromName = email.from || "Unknown Sender";
                    const fromEmail = email.fromEmail || "unknown@domain.com";
                    const subject = email.subject || "(No Subject)";
                    const body = email.body || "";
                    const dateStr = email.date || new Date().toISOString();

                    const { priority, category } = await classifyEmail(subject, body);
                    const textToEmbed = `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\nBody: ${body}`;
                    const embedding = await getEmbedding(textToEmbed);
                    const formattedEmbedding = formatVector(embedding);

                    await query(
                      `INSERT INTO emails (id, user_email, from_name, from_email, subject, body, date, read, priority, category, embedding)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)
                       ON CONFLICT (id) DO UPDATE SET 
                         read = EXCLUDED.read,
                         priority = EXCLUDED.priority,
                         category = EXCLUDED.category`,
                      [emailId, session.user.email, fromName, fromEmail, subject, body, dateStr, email.read ?? false, priority, category, formattedEmbedding]
                    );
                  }
                }
              } catch (err: any) {
                console.error(`[Emails API] Failed to sync email ${skeleton.id}:`, err.message);
              }
            }));
          }
        }
      } catch (syncError) {
        console.error("[Emails API] Sync error from Corsair:", syncError);
      }
    }

    // Get total count of emails for pagination metadata
    const countTotalRes = await query("SELECT count(*)::int as count FROM emails WHERE user_email = $1", [session.user.email]);
    const totalCount = countTotalRes.rows[0]?.count || 0;

    // Fetch the paginated page of emails, sorted chronologically (latest at top)
    const { rows } = await query(
      `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
       FROM emails 
       WHERE user_email = $1
       ORDER BY date DESC LIMIT $2 OFFSET $3`,
      [session.user.email, limit, offset]
    );

    return NextResponse.json({ emails: rows, total: totalCount });
  } catch (error: any) {
    console.error("[Emails API GET Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

// POST /api/emails - Perform operations (mark read, archive)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const { action, id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Email ID is required" }, { status: 400 });
    }

    if (action === "mark_read") {
      await query("UPDATE emails SET read = TRUE WHERE id = $1 AND user_email = $2", [id, session.user.email]);
      return NextResponse.json({ success: true, message: "Email marked as read" });
    }

    if (action === "archive") {
      await query("DELETE FROM emails WHERE id = $1 AND user_email = $2", [id, session.user.email]);
      return NextResponse.json({ success: true, message: "Email archived" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Emails API POST Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
