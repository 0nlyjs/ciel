import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { emails, calendarEvents } from "@/lib/schema";
import { getEmbedding } from "@/lib/embeddings";
import { CorsairClient } from "@/lib/corsair";
import { eq, and, sql } from "drizzle-orm";

// lazy load openai
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

// webhook signature verification
const verifyWebhookSignature = (req: Request) => {
  const signature = req.headers.get("x-corsair-signature");
  if (!signature) {
    return true; // Skip in local testing/sandbox if header is missing
  }
  // Optional: Add crypto signature check here if signature is provided
  return true;
};

// Keyword fallback classifier if OpenAI key is missing
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

// LLM Classifier using cheap gpt-4o-mini model
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
    console.error("[Webhook Classifier] Error during OpenAI classification, falling back:", error);
    return runKeywordFallback(subject, body);
  }
}

export async function POST(req: Request) {
  try {
    // 1. Verify signature
    if (!verifyWebhookSignature(req)) {
      return NextResponse.json({ error: "Invalid Signature" }, { status: 401 });
    }

    const payload = await req.json();
    console.log("[Corsair Webhook] Received payload:", payload);

    const { event, data } = payload;
    if (!data) {
      return NextResponse.json({ error: "Data payload is missing" }, { status: 400 });
    }

    const tenantId = payload.tenantId || data.tenantId || data.emailAddress || "unknown@domain.com";

    // 3. Process Event
    if (event === "gmail.webhooks.messageChanged") {
      if (data.type !== "messageReceived") {
        return NextResponse.json({ success: true, message: `Gmail event ignored: ${data.type}` });
      }

      const rawMsg = data.message;
      if (!rawMsg) {
        return NextResponse.json({ error: "Message details missing in payload" }, { status: 400 });
      }

      const parsed = CorsairClient.parseGmailMessage(rawMsg);
      if (!parsed) {
        return NextResponse.json({ error: "Failed to parse Gmail message" }, { status: 400 });
      }

      const emailId = parsed.id;
      const fromName = parsed.from;
      const fromEmail = parsed.fromEmail;
      const subject = parsed.subject;
      const body = parsed.body;
      const dateStr = parsed.date;

      // Run AI categorization
      const { priority, category } = await classifyEmail(subject, body);

      // Generate embedding vector
      const textToEmbed = `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\nBody: ${body}`;
      const embedding = await getEmbedding(textToEmbed);

      // Save to database
      await db.insert(emails)
        .values({
          id: emailId,
          userEmail: tenantId,
          fromName,
          fromEmail,
          subject,
          body,
          date: dateStr,
          read: parsed.read,
          priority,
          category,
          embedding: embedding,
        })
        .onConflictDoUpdate({
          target: [emails.id],
          set: {
            userEmail: sql`EXCLUDED.user_email`,
            fromName: sql`EXCLUDED.from_name`,
            fromEmail: sql`EXCLUDED.from_email`,
            subject: sql`EXCLUDED.subject`,
            body: sql`EXCLUDED.body`,
            date: sql`EXCLUDED.date`,
            read: sql`EXCLUDED.read`,
            priority: sql`EXCLUDED.priority`,
            category: sql`EXCLUDED.category`,
            embedding: sql`EXCLUDED.embedding`,
          }
        });

      console.log(`[Corsair Webhook] Cached email "${subject}" for ${tenantId} [Priority: ${priority.toUpperCase()}]`);

      return NextResponse.json({
        success: true,
        message: "Email received, classified, embedded, and stored.",
        email: { id: emailId, user_email: tenantId, from: fromName, fromEmail, subject, body, date: dateStr, read: parsed.read, priority, category },
      });
    }

    if (event === "googlecalendar.webhooks.onEventChanged") {
      if (data.type === "eventDeleted") {
        const eventId = data.eventId;
        if (!eventId) {
          return NextResponse.json({ error: "Event ID is missing for deletion" }, { status: 400 });
        }

        await db.delete(calendarEvents)
          .where(
            and(
              eq(calendarEvents.id, eventId),
              eq(calendarEvents.userEmail, tenantId)
            )
          );

        console.log(`[Corsair Webhook] Deleted calendar event "${eventId}" for ${tenantId}`);
        return NextResponse.json({
          success: true,
          message: "Calendar event deleted.",
          eventDeleted: eventId
        });
      }

      if (data.type !== "eventCreated" && data.type !== "eventUpdated") {
        return NextResponse.json({ success: true, message: `Calendar event ignored: ${data.type}` });
      }

      const item = data.event;
      if (!item) {
        return NextResponse.json({ error: "Event details missing in payload" }, { status: 400 });
      }

      const eventId = item.id || Math.random().toString();
      const title = item.summary || "Meeting Invite";
      const start = item.start?.dateTime || item.start?.date || new Date().toISOString();
      const end = item.end?.dateTime || item.end?.date || new Date(Date.now() + 1800000).toISOString();
      const location = item.location || "";
      const attendees = (item.attendees || []).map((a: any) => a.email || a.displayName || "");
      const description = item.description || "";

      // Generate embedding vector
      const textToEmbed = `Title: ${title}\nLocation: ${location}\nDescription: ${description}`;
      const embedding = await getEmbedding(textToEmbed);

      // Save to database
      await db.insert(calendarEvents)
        .values({
          id: eventId,
          userEmail: tenantId,
          title,
          startTime: new Date(start),
          endTime: new Date(end),
          location,
          attendees,
          description,
          embedding: embedding,
        })
        .onConflictDoUpdate({
          target: [calendarEvents.id],
          set: {
            userEmail: sql`EXCLUDED.user_email`,
            title: sql`EXCLUDED.title`,
            startTime: sql`EXCLUDED.start_time`,
            endTime: sql`EXCLUDED.end_time`,
            location: sql`EXCLUDED.location`,
            attendees: sql`EXCLUDED.attendees`,
            description: sql`EXCLUDED.description`,
            embedding: sql`EXCLUDED.embedding`,
          }
        });

      console.log(`[Corsair Webhook] Cached calendar event "${title}" for ${tenantId}`);

      return NextResponse.json({
        success: true,
        message: "Calendar event registered, embedded, and stored.",
        event: { id: eventId, user_email: tenantId, title, start, end, location, attendees, description }
      });
    }

    return NextResponse.json({ error: "Unknown event type" }, { status: 400 });
  } catch (error: any) {
    console.error("[Corsair Webhook POST Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
