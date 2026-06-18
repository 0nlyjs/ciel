import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails } from "@/lib/schema";
import { eq, and, desc, lt, ilike, or, not, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { syncUserEmails } from "@/lib/sync";
import { CorsairClient } from "@/lib/corsair";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export async function GET(req: Request) {
  try {
    // 1. High-Speed Session Extraction
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const { searchParams } = new URL(req.url);

    // Extract Query Parameters
    const cursor = searchParams.get("cursor"); // ISO Timestamp of the last loaded email
    const folder = searchParams.get("folder") || "inbox";
    const searchQuery = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "30", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const sync = searchParams.get("sync") === "true";
    const syncLimit = parseInt(searchParams.get("sync_limit") || "30", 10);

    // Build the Dynamic Index-Optimized Query
    const conditions = [eq(emails.userId, userId)];

    // Apply Cursor (O(1) offset targeting via idx_emails_date)
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        conditions.push(lt(emails.date, cursorDate));
      }
    }

    // Apply Folder Filtering
    if (folder === "sent") {
      conditions.push(sql`${ilike(emails.labelIds, "%SENT%")}`);
    } else if (folder === "starred") {
      conditions.push(sql`${ilike(emails.labelIds, "%STARRED%")}`);
    } else if (folder === "drafts") {
      conditions.push(sql`${ilike(emails.labelIds, "%DRAFT%")}`);
    } else if (folder === "spam") {
      conditions.push(sql`${ilike(emails.labelIds, "%SPAM%")}`);
    } else if (folder === "trash") {
      conditions.push(sql`${ilike(emails.labelIds, "%TRASH%")}`);
    } else if (folder === "all") {
      conditions.push(sql`${and(not(ilike(emails.labelIds, "%SPAM%")), not(ilike(emails.labelIds, "%TRASH%")))}`);
    } else if (folder === "social") {
      conditions.push(sql`${ilike(emails.labelIds, "%CATEGORY_SOCIAL%")}`);
    } else if (folder === "promotions") {
      conditions.push(sql`${ilike(emails.labelIds, "%CATEGORY_PROMOTIONS%")}`);
    } else if (folder === "updates") {
      conditions.push(sql`${ilike(emails.labelIds, "%CATEGORY_UPDATES%")}`);
    } else {
      // Default: inbox (exclude trash and spam as well)
      conditions.push(
        sql`${and(
          or(ilike(emails.labelIds, "%INBOX%"), and(sql`${emails.labelIds} IS NULL`, not(ilike(emails.labelIds, "%SENT%")))),
          not(ilike(emails.labelIds, "%SPAM%")),
          not(ilike(emails.labelIds, "%TRASH%"))
        )}`,
      );
    }

    // Apply Native ILIKE Search (Vector search is handled by a separate route)
    if (searchQuery) {
      conditions.push(
        sql`${or(
          ilike(emails.subject, `%${searchQuery}%`),
          ilike(emails.fromName, `%${searchQuery}%`),
          ilike(emails.fromEmail, `%${searchQuery}%`),
        )}`,
      );
    }

    // Calculate initial count in database
    const [countResultBefore] = await db
      .select({ count: sql<number>`count(*)` })
      .from(emails)
      .where(and(...conditions));
    let localTotal = Number(countResultBefore?.count || 0);

    // Sync Strategy: Blocking if database is empty, asynchronous otherwise
    if (sync && userEmail) {
      let q = "label:INBOX";
      if (folder === "sent") {
        q = "label:SENT";
      } else if (folder === "starred") {
        q = "label:STARRED";
      } else if (folder === "drafts") {
        q = "label:DRAFT";
      } else if (folder === "spam") {
        q = "label:SPAM";
      } else if (folder === "trash") {
        q = "label:TRASH";
      } else if (folder === "all") {
        q = ""; // All Mail sync
      } else if (folder === "social") {
        q = "category:social";
      } else if (folder === "promotions") {
        q = "category:promotions";
      } else if (folder === "updates") {
        q = "category:updates";
      }

      console.log(`[API EMAILS GET] Triggering sync for folder ${folder} and query ${q} (blocking if database empty)...`);
      const syncPromise = (async () => {
        try {
          const result = await syncUserEmails(userId, userEmail, undefined, syncLimit, q);
          if (result && result.count > 0) {
            console.log(`[API EMAILS GET] Sync finished. Saving ${result.count} new emails. Broadcasting new_email...`);
            const { activeClients } = await import("@/app/api/sync/stream/route");
            const clientControllers = activeClients.get(userEmail);
            if (clientControllers && clientControllers.length > 0) {
              const eventData = new TextEncoder().encode("data: new_email\n\n");
              clientControllers.forEach((controller) => {
                try {
                  controller.enqueue(eventData);
                } catch (err) {
                  console.error("[API EMAILS GET] Failed to broadcast event:", err);
                }
              });
            }
          }
        } catch (syncErr) {
          console.error("[API EMAILS GET] Sync error:", syncErr);
        }
      })();

      // If we have no local emails at all, wait for the sync to complete before querying database
      if (localTotal === 0) {
        console.log(`[API EMAILS GET] Database cache is empty. Blocking request until sync completes...`);
        await syncPromise;
        // Re-calculate the local count
        const [countResultAfter] = await db
          .select({ count: sql<number>`count(*)` })
          .from(emails)
          .where(and(...conditions));
        localTotal = Number(countResultAfter?.count || 0);
      }
    }

    const total = localTotal;

    // 3. Execute Query
    const data = await db
      .select()
      .from(emails)
      .where(and(...conditions))
      .orderBy(desc(emails.date)) // Chronological sort hits the index perfectly
      .limit(limit)
      .offset(offset);

    // 4. Calculate Next Cursor Payload for the UI
    const nextCursor =
      data.length === limit ? data[data.length - 1].date.toISOString() : null;

    // Map response data fromName to from
    const mappedEmails = data.map((email) => ({
      ...email,
      from: email.fromName || email.fromEmail || "",
    }));

    return NextResponse.json(
      {
        emails: mappedEmails,
        data: mappedEmails, // compatibility fallback
        total,
        nextCursor,
        hasMore: offset + data.length < total || !!nextCursor,
        totalReturned: data.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API EMAILS GET] Failed to execute feed hydration:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// lazy load openai
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

function handleFallbackReplies(subject: string, fromName: string) {
  return [
    {
      label: "Accept Politely",
      body: `Hi ${fromName},\n\nSounds good! Approved.\n\nBest,\nCiel Assistant`,
    },
    {
      label: "Request Details",
      body: `Hi ${fromName},\n\nCould you please provide more details or context?\n\nThanks,\nCiel Assistant`,
    },
    {
      label: "Decline/Busy",
      body: `Hi ${fromName},\n\nThanks for reaching out. I'm currently busy but will get back to you soon.\n\nBest,\nCiel Assistant`,
    },
  ];
}

// POST /api/emails - Perform operations (mark read, archive, suggest replies, send)
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyData = await req.json();
    const { action, id } = bodyData;

    if (action === "suggest_replies") {
      const { subject, body, fromName } = bodyData;
      const openaiClient = getOpenAIClient();

      if (!openaiClient) {
        console.warn("[Emails API] OpenAI is not configured. Falling back to templates.");
        const suggestions = handleFallbackReplies(subject, fromName || "there");
        return NextResponse.json({ success: true, suggestions });
      }

      try {
        const response = await generateText({
          model: openaiClient("gpt-4o-mini"),
          prompt: `You are Ciel's smart reply drafting assistant.
Given the original email's subject, body, and sender name, generate exactly 3 distinct reply options.
Each option should match a different intent:
1. Option 1: Agreeing/positive/acceptance
2. Option 2: Requesting more information, rescheduling, or clarifying
3. Option 3: Polite refusal, decline, or busy response

Subject: ${subject}
From: ${fromName}
Body: ${body}

Respond ONLY with a JSON object conforming to this TypeScript interface:
{
  "suggestions": [
    { "label": "Accept Politely", "body": "full drafted email body text..." },
    { "label": "Request Details", "body": "full drafted email body text..." },
    { "label": "Decline/Busy", "body": "full drafted email body text..." }
  ]
}
Do not wrap in markdown code blocks.`,
        });

        const cleanText = response.text.trim().replace(/^```json/gi, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(cleanText);
        if (parsed && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
          return NextResponse.json({ success: true, suggestions: parsed.suggestions });
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json({ success: true, suggestions: parsed });
        }
        throw new Error("Invalid suggestions format from AI");
      } catch (err: any) {
        console.error("[Emails API] AI reply generation failed, falling back to templates:", err);
        const suggestions = handleFallbackReplies(subject, fromName || "there");
        return NextResponse.json({ success: true, suggestions });
      }
    }

    if (action === "star") {
      const { starred } = bodyData;
      if (!id) return NextResponse.json({ error: "Email ID is required" }, { status: 400 });

      // Fetch the email first to update its labelIds locally
      const [email] = await db.select().from(emails).where(and(eq(emails.id, id), eq(emails.userId, session.user.id))).limit(1);
      if (email) {
        let labels = (email.labelIds || "").split(",").filter(Boolean);
        if (starred) {
          if (!labels.includes("STARRED")) labels.push("STARRED");
        } else {
          labels = labels.filter(l => l !== "STARRED");
        }
        await db.update(emails)
          .set({ labelIds: labels.join(",") })
          .where(eq(emails.id, id));
      }

      // Sync the change to Gmail via Corsair client
      try {
        await CorsairClient.modifyGmailMessageLabels(
          id,
          starred ? ["STARRED"] : [],
          starred ? [] : ["STARRED"],
          session.user.email,
        );
      } catch (err) {
        console.error("[Emails API POST star] Failed to sync star status to Gmail:", err);
      }

      return NextResponse.json({ success: true, message: starred ? "Email starred" : "Email unstarred" });
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
          userId: session.user.id,
          fromName: session.user.name || "You",
          fromEmail: session.user.email,
          subject: subject,
          body: emailBody,
          date: new Date(),
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

// PATCH /api/emails - Update an email's properties (read state)
export async function PATCH(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id || !session?.user?.email) {
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

    await db
      .update(emails)
      .set(setFields)
      .where(and(eq(emails.id, id), eq(emails.userId, session.user.id)));

    if (updates.read !== undefined && updates.read) {
      try {
        await CorsairClient.markGmailMessageRead(id, session.user.email);
      } catch (err) {
        console.error("[Emails API PATCH] Failed to update status on Gmail:", err);
      }
    }

    return NextResponse.json({ success: true, message: "Email updated successfully" });
  } catch (error: any) {
    console.error("[Emails API PATCH Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}

// DELETE /api/emails - Delete/archive an email
export async function DELETE(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Email ID is required" }, { status: 400 });
    }

    await db
      .delete(emails)
      .where(and(eq(emails.id, id), eq(emails.userId, session.user.id)));

    return NextResponse.json({ success: true, message: "Email deleted successfully" });
  } catch (error: any) {
    console.error("[Emails API DELETE Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}
