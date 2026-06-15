import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { emails, calendarEvents, searchDocuments } from "@/lib/schema";
import { getEmbedding } from "@/lib/embeddings";
import { CorsairClient, corsair } from "@/lib/corsair";
import { eq, and, sql } from "drizzle-orm";
import { processWebhook } from "corsair";

// lazy load openai
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
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
): Promise<{
  priority: "high" | "medium" | "low";
  category: "work" | "personal" | "updates" | "promotions";
  sentiment: string;
  quickReplies: string[];
  contextTag: string;
}> {
  const client = getOpenAIClient();
  if (!client) {
    const fallback = runKeywordFallback(subject, body);
    return {
      priority: fallback.priority,
      category: fallback.category,
      sentiment: "neutral",
      quickReplies: [
        "Sounds good, approved.",
        "I need more details.",
        "Let's discuss on a call."
      ],
      contextTag: fallback.category === "work" ? "Work" : "General"
    };
  }

  try {
    const prompt = `Classify the following email by priority ("high", "medium", or "low") and category ("work", "personal", "updates", or "promotions").
Also analyze the sentiment and generate 3 quick reply options and a context grouping tag.

Subject: ${subject}
Body: ${body}

Respond with a raw JSON object containing exactly these keys:
- "priority": "high" | "medium" | "low"
- "category": "work" | "personal" | "updates" | "promotions"
- "sentiment": string (e.g. "positive", "neutral", "negative", "urgent")
- "quickReplies": array of 3 distinct, short response strings (e.g. ["Sounds good, approved.", "I need more details.", "Let's discuss on a call."])
- "contextTag": a 1-to-3 word string grouping the email into a logical project or client stream (e.g. "Design Contract", "Personal", "Investor Updates")

Do not wrap in markdown code blocks.`;

    const { text } = await generateText({
      model: client("gpt-4o-mini"),
      prompt,
    });

    const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    return {
      priority: parsed.priority || "medium",
      category: parsed.category || "work",
      sentiment: parsed.sentiment || "neutral",
      quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies : [
        "Sounds good, approved.",
        "I need more details.",
        "Let's discuss on a call."
      ],
      contextTag: parsed.contextTag || "General",
    };
  } catch (error) {
    console.error("[Webhook Classifier] Error during OpenAI classification, falling back:", error);
    const fallback = runKeywordFallback(subject, body);
    return {
      priority: fallback.priority,
      category: fallback.category,
      sentiment: "neutral",
      quickReplies: [
        "Sounds good, approved.",
        "I need more details.",
        "Let's discuss on a call."
      ],
      contextTag: fallback.category === "work" ? "Work" : "General"
    };
  }
}

async function classifyEvent(
  title: string,
  description: string
): Promise<{ contextTag: string }> {
  const client = getOpenAIClient();
  if (!client) {
    return { contextTag: "General" };
  }
  try {
    const prompt = `Based on the calendar event title and description, output a 1-to-3 word context tagging stream (e.g. "Work", "Meeting", "Design Contract", "Personal", "Investor Updates").
Title: ${title}
Description: ${description}

Respond with a raw JSON object containing exactly one key: "contextTag". Do not wrap in markdown code blocks.`;

    const { text } = await generateText({
      model: client("gpt-4o-mini"),
      prompt,
    });
    const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanText);
    return { contextTag: parsed.contextTag || "General" };
  } catch (error) {
    console.error("[Webhook Event Classifier] Error during OpenAI classification:", error);
    return { contextTag: "General" };
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const headers = Object.fromEntries(req.headers.entries());
    const query = Object.fromEntries(new URL(req.url).searchParams.entries());

    // Process webhook using new SDK (this handles signature verification and parsing)
    const result = await processWebhook(corsair, headers, rawBody, query);

    if (!result.plugin) {
      return NextResponse.json({ error: "No matching plugin found" }, { status: 400 });
    }

    const { plugin, action, body: data, responseHeaders } = result;

    if (!data) {
      return NextResponse.json({ error: "Data payload is missing" }, { status: 400, headers: responseHeaders });
    }

    console.log("[Corsair Webhook] Processed payload:", data);

    const tenantId = query.tenantId || (data as any).tenantId || (data as any).emailAddress || "unknown@domain.com";

    // 3. Process Event
    if (plugin === "gmail" && action === "messageChanged") {
      if ((data as any).type !== "messageReceived") {
        return NextResponse.json({ success: true, message: `Gmail event ignored: ${(data as any).type}` }, { headers: responseHeaders });
      }

      const rawMsg = (data as any).message;
      if (!rawMsg) {
        return NextResponse.json({ error: "Message details missing in payload" }, { status: 400, headers: responseHeaders });
      }

      const parsed = CorsairClient.parseGmailMessage(rawMsg);
      if (!parsed) {
        return NextResponse.json({ error: "Failed to parse Gmail message" }, { status: 400, headers: responseHeaders });
      }

      const emailId = parsed.id;
      const fromName = parsed.from;
      const fromEmail = parsed.fromEmail;
      const subject = parsed.subject;
      const body = parsed.body;
      const dateStr = parsed.date;

      // Run AI categorization
      const { priority, category, quickReplies, contextTag } = await classifyEmail(subject, body);

      // Generate embedding vector
      const cleanBodyForEmbedding = (body || "").substring(0, 15000);
      const textToEmbed = `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\nBody: ${cleanBodyForEmbedding}`;
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
          quickReplies,
          contextTag,
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
            quickReplies: sql`EXCLUDED.quick_replies`,
            contextTag: sql`EXCLUDED.context_tag`,
          }
        });

      if (embedding) {
        await db.insert(searchDocuments)
          .values({
            id: `email:${emailId}`,
            sourceType: "email",
            sourceId: emailId,
            content: textToEmbed,
            embedding,
          })
          .onConflictDoUpdate({
            target: [searchDocuments.id],
            set: {
              content: textToEmbed,
              embedding,
            }
          });
      }

      console.log(`[Corsair Webhook] Cached email "${subject}" for ${tenantId} [Priority: ${priority.toUpperCase()}]`);

      return NextResponse.json({
        success: true,
        message: "Email received, classified, embedded, and stored.",
        email: { id: emailId, user_email: tenantId, from: fromName, fromEmail, subject, body, date: dateStr, read: parsed.read, priority, category },
      }, { headers: responseHeaders });
    }

    if (plugin === "googlecalendar" && action === "onEventChanged") {
      if ((data as any).type === "eventDeleted") {
        const eventId = (data as any).eventId;
        if (!eventId) {
          return NextResponse.json({ error: "Event ID is missing for deletion" }, { status: 400, headers: responseHeaders });
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
        }, { headers: responseHeaders });
      }

      if ((data as any).type !== "eventCreated" && (data as any).type !== "eventUpdated") {
        return NextResponse.json({ success: true, message: `Calendar event ignored: ${(data as any).type}` }, { headers: responseHeaders });
      }

      const item = (data as any).event;
      if (!item) {
        return NextResponse.json({ error: "Event details missing in payload" }, { status: 400, headers: responseHeaders });
      }

      const eventId = item.id || Math.random().toString();
      const title = item.summary || "Meeting Invite";
      const start = item.start?.dateTime || item.start?.date || new Date().toISOString();
      const end = item.end?.dateTime || item.end?.date || new Date(Date.now() + 1800000).toISOString();
      const location = item.location || "";
      const attendees = (item.attendees || []).map((a: any) => a.email || a.displayName || "");
      const description = item.description || "";

      // Run AI categorization
      const { contextTag } = await classifyEvent(title, description);

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
          contextTag,
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
            contextTag: sql`EXCLUDED.context_tag`,
          }
        });

      if (embedding) {
        await db.insert(searchDocuments)
          .values({
            id: `event:${eventId}`,
            sourceType: "event",
            sourceId: eventId,
            content: textToEmbed,
            embedding,
          })
          .onConflictDoUpdate({
            target: [searchDocuments.id],
            set: {
              content: textToEmbed,
              embedding,
            }
          });
      }

      console.log(`[Corsair Webhook] Cached calendar event "${title}" for ${tenantId}`);

      return NextResponse.json({
        success: true,
        message: "Calendar event registered, embedded, and stored.",
        event: { id: eventId, user_email: tenantId, title, start, end, location, attendees, description }
      }, { headers: responseHeaders });
    }

    return NextResponse.json({ error: "Unknown event type" }, { status: 400, headers: responseHeaders });
  } catch (error: any) {
    console.error("[Corsair Webhook POST Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

