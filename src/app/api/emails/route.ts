import { CorsairClient } from "@/lib/corsair";
import { NextResponse } from "next/server";
import { dbInit, query } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getEmbedding, getEmbeddingsBatch, formatVector } from "@/lib/embeddings";

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

  if (
    content.includes("meeting") ||
    content.includes("calendar") ||
    content.includes("schedule")
  ) {
    category = "updates";
  }

  return { priority, category };
}

async function classifyEmail(
  subject: string,
  body: string,
): Promise<{
  priority: "high" | "medium" | "low";
  category: "work" | "personal" | "updates" | "promotions";
}> {
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

    const cleanText = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleanText);

    return {
      priority: parsed.priority || "medium",
      category: parsed.category || "work",
    };
  } catch (error) {
    console.error(
      "[Classifier] Error during OpenAI classification, falling back:",
      error,
    );
    return runKeywordFallback(subject, body);
  }
}

async function syncBatchOfSkeletons(skeletons: any[], userEmail: string) {
  if (skeletons.length === 0) return;

  // 1. Fetch raw messages in parallel from Gmail
  const rawMessages = await Promise.all(
    skeletons.map(async (skeleton) => {
      try {
        return await CorsairClient.getGmailMessageDirectly(skeleton.id, userEmail);
      } catch (err) {
        console.error(`[Sync] Failed to fetch message ${skeleton.id}:`, err);
        return null;
      }
    })
  );
  const filteredMessages = rawMessages.filter(m => m !== null);

  // 2. Parse messages and prepare texts for batch embedding
  const parsedEmails: any[] = [];
  const textsToEmbed: string[] = [];

  for (const rawMsg of filteredMessages) {
    const email = CorsairClient.parseGmailMessage(rawMsg);
    if (email) {
      const fromName = email.from || "Unknown Sender";
      const fromEmail = email.fromEmail || "unknown@domain.com";
      const subject = email.subject || "(No Subject)";
      const body = email.body || "";
      const textToEmbed = `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\nBody: ${body}`;
      
      parsedEmails.push({
        id: email.id,
        fromName,
        fromEmail,
        subject,
        body,
        date: email.date || new Date().toISOString(),
        read: email.read ?? false,
        textToEmbed,
      });
      textsToEmbed.push(textToEmbed);
    }
  }

  // 3. Generate batch embeddings in a single OpenAI request
  let embeddings: number[][] | null = [];
  if (textsToEmbed.length > 0) {
    try {
      embeddings = await getEmbeddingsBatch(textsToEmbed);
    } catch (embErr) {
      console.error("[Sync] Error in batch embeddings, proceeding without embeddings:", embErr);
    }
  }

  // 4. Save to DB concurrently with fast keyword-based fallback classification
  await Promise.all(
    parsedEmails.map(async (email, i) => {
      const embedding = embeddings && embeddings[i] ? embeddings[i] : null;
      const formattedEmbedding = formatVector(embedding);
      
      // Fast classification using keyword fallback
      const { priority, category } = runKeywordFallback(email.subject, email.body);

      try {
        await query(
          `INSERT INTO emails (id, user_email, from_name, from_email, subject, body, date, read, priority, category, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)
           ON CONFLICT (id) DO UPDATE SET 
             read = EXCLUDED.read,
             priority = EXCLUDED.priority,
             category = EXCLUDED.category`,
          [email.id, userEmail, email.fromName, email.fromEmail, email.subject, email.body, email.date, email.read, priority, category, formattedEmbedding]
        );
      } catch (err: any) {
        console.error(`[Sync] Failed to insert email ${email.id} into database:`, err.message);
      }
    })
  );
}

async function runBackgroundSyncForRemaining(
  skeletons: any[],
  userEmail: string,
) {
  console.log(
    `[Background Sync] Starting background fetch for ${skeletons.length} remaining emails for ${userEmail}`,
  );
  try {
    // Sync in batches of 50
    for (let i = 0; i < skeletons.length; i += 50) {
      const batch = skeletons.slice(i, i + 50);
      await syncBatchOfSkeletons(batch, userEmail);
    }
    console.log(
      `[Background Sync] Completed background fetch for ${userEmail}`,
    );
  } catch (err) {
    console.error(
      "[Background Sync] Fatal error during background email sync:",
      err,
    );
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
    const syncLimit = parseInt(url.searchParams.get("sync_limit") || "150", 10);

    let hasMore = true;
    let messageSkeletonsLength = undefined;

    // Sync from Corsair if sync=true was requested
    if (forceSync) {
      console.log(`[Emails API] Sync requested for ${session.user.email} (limit: ${syncLimit})...`);
      try {
        const messageSkeletons = await CorsairClient.listGmailMessagesDirectly(
          session.user.email,
          syncLimit,
        );
        messageSkeletonsLength = messageSkeletons.length;
        console.log(
          `[Emails API] Corsair returned ${messageSkeletonsLength} message skeletons.`,
        );

        if (messageSkeletonsLength < syncLimit) {
          hasMore = false;
        }

        if (messageSkeletonsLength > 0) {
          // Fetch existing email IDs to avoid duplicates
          const existingRes = await query(
            "SELECT id FROM emails WHERE user_email = $1",
            [session.user.email],
          );
          const existingIds = new Set(existingRes.rows.map((r: any) => r.id));

          const missingSkeletons = messageSkeletons.filter(
            (msg) => !existingIds.has(msg.id),
          );
          console.log(
            `[Emails API] Found ${missingSkeletons.length} missing emails to fetch.`,
          );

          // Phase 1: Sync first 50 missing emails immediately to return quickly
          const firstBatch = missingSkeletons.slice(0, 50);
          const remainingBatch = missingSkeletons.slice(50);

          if (firstBatch.length > 0) {
            console.log(
              `[Emails API] Syncing ${firstBatch.length} latest emails immediately...`,
            );
            await syncBatchOfSkeletons(firstBatch, session.user.email);
          }

          // Phase 2: Start background sync for the remaining emails (asynchronous)
          if (remainingBatch.length > 0) {
            console.log(
              `[Emails API] Phase 2: Launching background sync for ${remainingBatch.length} remaining emails...`,
            );
            runBackgroundSyncForRemaining(
              remainingBatch,
              session.user.email,
            ).catch((err) => {
              console.error(
                "[Emails API] Background sync launcher error:",
                err,
              );
            });
          }
        }
      } catch (syncError) {
        console.error("[Emails API] Sync error from Corsair:", syncError);
      }
    }

    // Get total count of emails for pagination metadata
    const countTotalRes = await query(
      "SELECT count(*)::int as count FROM emails WHERE user_email = $1",
      [session.user.email],
    );
    const totalCount = countTotalRes.rows[0]?.count || 0;

    // Fetch the paginated page of emails, sorted chronologically (latest at top)
    const { rows } = await query(
      `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
       FROM emails 
       WHERE user_email = $1
       ORDER BY date DESC LIMIT $2 OFFSET $3`,
      [session.user.email, limit, offset],
    );

    return NextResponse.json({ 
      emails: rows, 
      total: totalCount, 
      hasMore: messageSkeletonsLength === undefined ? true : hasMore
    });
  } catch (error: any) {
    console.error("[Emails API GET Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
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
      return NextResponse.json(
        { error: "Email ID is required" },
        { status: 400 },
      );
    }

    if (action === "mark_read") {
      await query(
        "UPDATE emails SET read = TRUE WHERE id = $1 AND user_email = $2",
        [id, session.user.email],
      );
      return NextResponse.json({
        success: true,
        message: "Email marked as read",
      });
    }

    if (action === "archive") {
      await query("DELETE FROM emails WHERE id = $1 AND user_email = $2", [
        id,
        session.user.email,
      ]);
      return NextResponse.json({ success: true, message: "Email archived" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Emails API POST Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}
