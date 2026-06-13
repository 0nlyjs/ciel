import { CorsairClient } from "@/lib/corsair";
import { NextResponse } from "next/server";
import { dbInit, query } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { syncUserEmails } from "@/lib/sync";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// lazy load openai
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

const handleFallbackReplies = (subject: string, senderName: string): { label: string; body: string }[] => {
  return [
    {
      label: "Accept Politely",
      body: `Hi ${senderName || "there"},\n\nThank you for reaching out regarding "${subject}". I would be happy to coordinate on this. Let's schedule a time to discuss details.\n\nBest regards,\nUser`
    },
    {
      label: "Request Details",
      body: `Hi ${senderName || "there"},\n\nThanks for your message about "${subject}". Could you please provide some additional context or specifications so I can review it further?\n\nThanks,\nUser`
    },
    {
      label: "Decline/Busy",
      body: `Hi ${senderName || "there"},\n\nThank you for the message. Unfortunately, I am currently fully booked and won't be able to commit to this right now. Hope to connect in the future.\n\nSincerely,\nUser`
    }
  ];
};

// GET /api/emails - Fetch all cached emails from database and sync if requested
export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const url = new URL(req.url);
    const forceSync = url.searchParams.get("sync") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const syncLimit = parseInt(url.searchParams.get("sync_limit") || "150", 10);

    // Check if Gmail integration is connected
    let gmailConnected = false;
    try {
      const integrationRes = await query(
        "SELECT status FROM user_integrations WHERE user_email = $1 AND provider = 'gmail'",
        [session.user.email]
      );
      gmailConnected = integrationRes.rows[0]?.status === 'connected';
    } catch (e) {
      console.error("[Emails API] Failed to check integration status:", e);
    }

    // Sync from Corsair inline and await it if sync=true was requested
    if (forceSync) {
      console.log(`[Emails API] Sync requested for ${session.user.email} (limit: ${syncLimit})...`);
      try {
        await syncUserEmails(session.user.email, syncLimit);
      } catch (err) {
        console.error("[Emails API] Sync failed:", err);
      }
    }

    // Get total count and fetch paginated emails concurrently
    const [countTotalRes, fetchRes] = await Promise.all([
      query(
        "SELECT count(*)::int as count FROM emails WHERE user_email = $1",
        [session.user.email],
      ),
      query(
        `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
         FROM emails 
         WHERE user_email = $1
         ORDER BY date DESC LIMIT $2 OFFSET $3`,
        [session.user.email, limit, offset],
      )
    ]);

    const totalCount = countTotalRes.rows[0]?.count || 0;
    const rows = fetchRes.rows;

    // If we paginated beyond totalCount, hasMore is false
    let hasMore = offset + limit < totalCount;
    if (!hasMore && gmailConnected) {
      // If we have at least filled up to the current offset, there might be more on Gmail
      hasMore = totalCount >= offset + limit;
    }

    return NextResponse.json({ 
      emails: rows, 
      total: totalCount, 
      hasMore: hasMore
    });
  } catch (error: any) {
    console.error("[Emails API GET Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}

// POST /api/emails - Perform operations (mark read, archive, suggest replies, send)
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const bodyData = await req.json();
    const { action, id } = bodyData;

    if (action === "mark_read") {
      if (!id) return NextResponse.json({ error: "Email ID is required" }, { status: 400 });
      await query(
        "UPDATE emails SET read = TRUE WHERE id = $1 AND user_email = $2",
        [id, session.user.email],
      );

      // Await write-back to Gmail servers to prevent serverless process termination
      try {
        await CorsairClient.markGmailMessageRead(id, session.user.email);
      } catch (err) {
        console.error("[Emails API] Failed to mark read on Gmail:", err);
      }

      return NextResponse.json({
        success: true,
        message: "Email marked as read locally and synced to Gmail",
      });
    }

    if (action === "archive") {
      if (!id) return NextResponse.json({ error: "Email ID is required" }, { status: 400 });
      await query("DELETE FROM emails WHERE id = $1 AND user_email = $2", [
        id,
        session.user.email,
      ]);
      return NextResponse.json({ success: true, message: "Email archived" });
    }

    if (action === "suggest_replies") {
      const { subject, body, fromName } = bodyData;
      const openaiClient = getOpenAIClient();

      if (!openaiClient) {
        console.warn("[Emails API] OPENAI_API_KEY is not configured. Falling back to local template suggestions.");
        const suggestions = handleFallbackReplies(subject, fromName);
        return NextResponse.json({ success: true, suggestions });
      }

      try {
        const response = await generateText({
          model: openaiClient.chat("gpt-4o-mini"),
          system: `You are Ciel's smart reply drafting assistant.
Given the original email's subject, body, and sender name, generate exactly 3 distinct reply options.
Each option should match a different intent:
1. Option 1: Agreeing/positive/acceptance
2. Option 2: Requesting more information, rescheduling, or clarifying
3. Option 3: Polite refusal, decline, or busy response

Respond ONLY with a JSON object conforming to this TypeScript interface:
{
  "suggestions": [
    { "label": "Accept Politely", "body": "full drafted email body text..." },
    { "label": "Request Details", "body": "full drafted email body text..." },
    { "label": "Decline/Busy", "body": "full drafted email body text..." }
  ]
}
Do not write any markdown code block wrap, only raw JSON.`,
          prompt: `Original Sender: ${fromName}\nOriginal Subject: ${subject}\nOriginal Body:\n${body}`
        });

        const jsonText = response.text.trim().replace(/^```json/, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(jsonText);
        return NextResponse.json({ success: true, suggestions: parsed.suggestions });
      } catch (err: any) {
        console.error("[Emails API] AI reply generation failed, falling back to templates:", err);
        const suggestions = handleFallbackReplies(subject, fromName);
        return NextResponse.json({ success: true, suggestions });
      }
    }

    if (action === "send") {
      const { to, subject, body: emailBody } = bodyData;
      if (!to || !subject || !emailBody) {
        return NextResponse.json({ error: "To, subject, and body are required to send an email." }, { status: 400 });
      }

      // 1. Send via Corsair Gmail Client
      await CorsairClient.sendEmail(to, subject, emailBody, session.user.email);

      // 2. Cache locally in Postgres emails table
      const emailId = "sent-" + Math.random().toString(36).substring(2, 12);
      const dateStr = new Date().toISOString();

      let formattedEmbedding: string | null = null;
      try {
        const { getEmbedding, formatVector } = await import("@/lib/embeddings");
        const textToEmbed = `To: ${to}\nSubject: ${subject}\nBody: ${emailBody}`;
        const embedding = await getEmbedding(textToEmbed);
        if (embedding) {
          formattedEmbedding = formatVector(embedding);
        }
      } catch (embErr) {
        console.error("[Emails API] Failed to generate embedding for sent email:", embErr);
      }

      await query(
        `INSERT INTO emails (id, user_email, from_name, from_email, subject, body, date, read, priority, category, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)`,
        [
          emailId,
          session.user.email,
          "You",
          session.user.email,
          subject,
          emailBody,
          dateStr,
          true,
          "medium",
          "work",
          formattedEmbedding
        ]
      );

      return NextResponse.json({ success: true, message: "Email sent successfully and cached locally." });
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
