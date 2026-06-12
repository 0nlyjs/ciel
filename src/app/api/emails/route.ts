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
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    // Sync from Corsair if local DB is empty for this user
    const checkRes = await query("SELECT count(*)::int as count FROM emails WHERE user_email = $1", [session.user.email]);
    const count = checkRes.rows[0]?.count || 0;

    if (count === 0) {
      console.log(`[Emails API] No emails cached for ${session.user.email}. Syncing from Corsair Gmail...`);
      try {
        const corsairEmails = await CorsairClient.searchEmails("", session.user.email);
        if (corsairEmails && corsairEmails.length > 0) {
          for (const email of corsairEmails) {
            const emailId = email.id || Math.random().toString();
            const fromName = email.from || "Unknown Sender";
            const fromEmail = email.fromEmail || "unknown@domain.com";
            const subject = email.subject || "(No Subject)";
            const body = email.body || "";
            const dateStr = email.date || new Date().toLocaleDateString();

            const { priority, category } = await classifyEmail(subject, body);

            const textToEmbed = `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\nBody: ${body}`;
            const embedding = await getEmbedding(textToEmbed);
            const formattedEmbedding = formatVector(embedding);

            await query(
              `INSERT INTO emails (id, user_email, from_name, from_email, subject, body, date, read, priority, category, embedding)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)
               ON CONFLICT (id) DO NOTHING`,
              [emailId, session.user.email, fromName, fromEmail, subject, body, dateStr, email.read ?? false, priority, category, formattedEmbedding]
            );
          }
        }
      } catch (syncError) {
        console.error("[Emails API] Sync error from Corsair:", syncError);
      }
    }

    const { rows } = await query(
      `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
       FROM emails 
       WHERE user_email = $1
       ORDER BY created_at DESC LIMIT 100`,
      [session.user.email]
    );

    return NextResponse.json({ emails: rows });
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
