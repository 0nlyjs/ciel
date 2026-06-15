import { CorsairClient } from "@/lib/corsair";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails, userIntegrations } from "@/lib/schema";
import { getServerSession } from "@/lib/auth";
import { syncUserEmails } from "@/lib/sync";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { eq, and, or, desc, sql, ilike, not, isNull } from "drizzle-orm";

// lazy load openai
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
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

    const url = new URL(req.url);
    const forceSync = url.searchParams.get("sync") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const syncLimit = parseInt(url.searchParams.get("sync_limit") || "50", 10);
    const folder = url.searchParams.get("folder") || "all";
    const priority = url.searchParams.get("priority");
    const category = url.searchParams.get("category");
    const q = url.searchParams.get("q") || url.searchParams.get("search");

    // Check if Gmail integration is connected
    let gmailConnected = false;
    try {
      const integrationRes = await db.select({
        status: userIntegrations.status,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userEmail, session.user.email),
          eq(userIntegrations.provider, "gmail")
        )
      );
      gmailConnected = integrationRes[0]?.status === 'connected';
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

    const conditions = [];

    if (folder === "sent") {
      conditions.push(ilike(emails.labelIds, "%SENT%"));
    } else {
      conditions.push(
        or(
          isNull(emails.labelIds),
          not(ilike(emails.labelIds, "%SENT%"))
        )
      );
    }

    if (priority) {
      conditions.push(eq(emails.priority, priority));
    }
    if (category) {
      conditions.push(eq(emails.category, category));
    }
    if (q) {
      const searchPattern = `%${q}%`;
      conditions.push(
        or(
          ilike(emails.subject, searchPattern),
          ilike(emails.body, searchPattern),
          ilike(emails.fromName, searchPattern),
          ilike(emails.fromEmail, searchPattern)
        )
      );
    }

    const whereClause = and(eq(emails.userEmail, session.user.email), ...conditions);

    // Get total count and fetch paginated emails concurrently
    const [countTotalRes, fetchRes] = await Promise.all([
      db.select({
        count: sql<number>`count(*)::int`,
      })
      .from(emails)
      .where(whereClause),
      db.select({
        id: emails.id,
        from: emails.fromName,
        fromEmail: emails.fromEmail,
        subject: emails.subject,
        body: emails.body,
        date: emails.date,
        read: emails.read,
        priority: emails.priority,
        category: emails.category,
        quickReplies: emails.quickReplies,
        contextTag: emails.contextTag,
        labelIds: emails.labelIds,
      })
      .from(emails)
      .where(whereClause)
      .orderBy(desc(emails.date))
      .limit(limit)
      .offset(offset)
    ]);

    const totalCount = countTotalRes[0]?.count || 0;
    const rows = fetchRes;

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

    const bodyData = await req.json();
    const { action, id } = bodyData;

    if (action === "mark_read") {
      if (!id) return NextResponse.json({ error: "Email ID is required" }, { status: 400 });
      
      await db.update(emails)
        .set({ read: true })
        .where(
          and(
            eq(emails.id, id),
            eq(emails.userEmail, session.user.email)
          )
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
      
      await db.delete(emails)
        .where(
          and(
            eq(emails.id, id),
            eq(emails.userEmail, session.user.email)
          )
        );
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

      // 2. Reflect in local database
      try {
        await db.insert(emails).values({
          id: `sent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          userEmail: session.user.email,
          fromName: session.user.name || "You",
          fromEmail: session.user.email,
          subject: subject,
          body: emailBody,
          date: new Date().toISOString(),
          read: true,
          priority: "medium",
          category: "work",
          labelIds: "SENT",
        });
      } catch (dbErr) {
        console.error("[Emails API POST send] Failed to write sent email to database:", dbErr);
      }

      return NextResponse.json({ success: true, message: "Email sent successfully." });
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

// PATCH /api/emails - Update an email's properties
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, updates } = await req.json();
    if (!id || !updates) {
      return NextResponse.json({ error: "Email ID and updates are required" }, { status: 400 });
    }

    const setFields: any = {};
    if (updates.read !== undefined) setFields.read = updates.read;
    if (updates.priority !== undefined) setFields.priority = updates.priority;
    if (updates.category !== undefined) setFields.category = updates.category;

    await db.update(emails)
      .set(setFields)
      .where(
        and(
          eq(emails.id, id),
          eq(emails.userEmail, session.user.email)
        )
      );

    if (updates.read !== undefined) {
      try {
        if (updates.read) {
          await CorsairClient.markGmailMessageRead(id, session.user.email);
        }
      } catch (err) {
        console.error("[Emails API PATCH] Failed to update status on Gmail:", err);
      }
    }

    return NextResponse.json({ success: true, message: "Email updated successfully" });
  } catch (error: any) {
    console.error("[Emails API PATCH Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/emails - Delete/archive an email
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Email ID is required" }, { status: 400 });
    }

    await db.delete(emails)
      .where(
        and(
          eq(emails.id, id),
          eq(emails.userEmail, session.user.email)
        )
      );

    return NextResponse.json({ success: true, message: "Email deleted successfully" });
  } catch (error: any) {
    console.error("[Emails API DELETE Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
