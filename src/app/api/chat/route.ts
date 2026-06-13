import { NextResponse } from "next/server";
import { generateText, tool, jsonSchema, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { dbInit, query as queryDb } from "@/lib/db";
import { getEmbedding, formatVector } from "@/lib/embeddings";
import { CorsairClient } from "@/lib/corsair";
import { getServerSession } from "@/lib/auth";

// lazy load openai
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

// regex fallback for simple commands when offline/no api key
const handleFallbackAI = async (prompt: string, tenantId: string): Promise<{ text: string; actionTriggered?: string }> => {
  const queryText = prompt.toLowerCase();
  await dbInit();

  if (queryText.includes("calendar") && (queryText.includes("invite") || queryText.includes("send") || queryText.includes("schedule"))) {
    const emailMatch = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : "dev@corsair.dev";
    const title = "Sync Meeting";
    const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week later
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const event = await CorsairClient.createCalendarInvite(title, [email], startISO, endISO, "Online", "Meeting scheduled via Ciel Console", tenantId);

    // Cache in DB
    const textToEmbed = `Title: ${title}\nLocation: Online\nDescription: Meeting scheduled via Ciel Console`;
    const embedding = await getEmbedding(textToEmbed);
    const formattedEmbedding = formatVector(embedding);

    await queryDb(
      `INSERT INTO calendar_events (id, user_email, title, start_time, end_time, location, attendees, description, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`,
      [event.id, tenantId, title, startISO, endISO, "Online", JSON.stringify([email]), "Meeting scheduled via Ciel Console", formattedEmbedding]
    );

    return {
      text: `Understood. I have formulated a calendar invite for a meeting next Thursday at 9:00 AM, and added ${email} to the list of attendees. The event has been registered on your calendar.`,
      actionTriggered: "calendar_invite",
    };
  }

  if (queryText.includes("email") && (queryText.includes("send") || queryText.includes("write") || queryText.includes("draft"))) {
    const emailMatch = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : "dev@corsair.dev";
    const subject = "Sync Confirmation";
    const body = "Hi there, confirming our scheduled coordinates. Let's sync up as planned.";

    await CorsairClient.sendEmail(email, subject, body, tenantId);

    // Cache in DB
    const textToEmbed = `To: ${email}\nSubject: ${subject}\nBody: ${body}`;
    const embedding = await getEmbedding(textToEmbed);
    const formattedEmbedding = formatVector(embedding);

    await queryDb(
      `INSERT INTO emails (id, user_email, from_name, from_email, subject, body, date, read, priority, category, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)
       ON CONFLICT (id) DO UPDATE SET subject = EXCLUDED.subject`,
      [
        Math.random().toString(),
        tenantId,
        "You",
        tenantId || "user@ciel.app",
        subject,
        body,
        new Date().toISOString(),
        true,
        "medium",
        "work",
        formattedEmbedding,
      ]
    );

    return {
      text: `Acknowledged. I have drafted and sent the email to ${email} confirming our synchronization and schedule.`,
      actionTriggered: "email_sent",
    };
  }

  if (queryText.includes("search") || queryText.includes("find")) {
    return {
      text: "Analyzing records... I have filtered your inbox matching that query. You can see the updated messages list in the Gmail pane.",
      actionTriggered: "search",
    };
  }

  return {
    text: "I am fully online. I can process voice or text commands to search your inbox, send emails, or schedule calendar coordinates. How can I help you?",
  };
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.email;
    const { messages, conversationId } = await req.json();
    const lastUserMessage = messages[messages.length - 1];

    const openaiClient = getOpenAIClient();

    // no api key? use local regex fallback
    if (!openaiClient) {
      console.warn("[Ciel Chat API] OPENAI_API_KEY is not configured. Falling back to local AI simulation.");
      const fallbackResult = await handleFallbackAI(lastUserMessage.content, tenantId);
      return NextResponse.json({ text: fallbackResult.text, fallback: true, tokens: 0 });
    }

    await dbInit();

    // 1. Daily limit check (1M tokens per user per day)
    const dailyTokenCheck = await queryDb(
      "SELECT COALESCE(SUM(tokens_used), 0) as total FROM conversations WHERE user_email = $1 AND updated_at >= NOW() - INTERVAL '1 day'",
      [tenantId]
    );
    const dailyTokensUsed = parseInt(dailyTokenCheck.rows[0]?.total || "0", 10);
    const DAILY_BUDGET_LIMIT = 1000000; // 1,000,000 tokens limit per user per day

    if (dailyTokensUsed >= DAILY_BUDGET_LIMIT) {
      console.warn(`[Ciel Chat API] User ${tenantId} reached daily budget limit of ${dailyTokensUsed} tokens.`);
      return NextResponse.json({
        text: "🚨 Daily Limit Reached: You have reached your daily limit of 1,000,000 tokens for this account. Please upgrade to the Pro Plan to continue using Ciel without restrictions.",
        tokens: 0
      });
    }

    // 2. Per-conversation limit check (100k tokens per conversation)
    if (conversationId) {
      const convCheck = await queryDb(
        "SELECT tokens_used FROM conversations WHERE id = $1 AND user_email = $2",
        [conversationId, tenantId]
      );
      if (convCheck.rows.length > 0) {
        const convTokensUsed = convCheck.rows[0].tokens_used || 0;
        const CONV_BUDGET_LIMIT = 100000; // 100k tokens per conversation

        if (convTokensUsed >= CONV_BUDGET_LIMIT) {
          console.warn(`[Ciel Chat API] Conversation ${conversationId} reached limit of ${convTokensUsed} tokens.`);
          return NextResponse.json({
            text: "🚨 Conversation Limit Reached: You have reached the limit of 100,000 tokens for this conversation. Please start a new conversation or upgrade to the Pro Plan to unlock unlimited tokens.",
            tokens: 0
          });
        }
      }
    }

    // Sliding window: only send the last 6 messages to the LLM to keep tokens low
    const truncatedMessages = messages.slice(-6);

    // run vercel ai sdk with tools using tool() and jsonSchema() wrappers
    const currentDateTime = new Date().toISOString();
    const response = await generateText({
      model: openaiClient.chat("gpt-4o-mini"),
      system: `You are Ciel, the sentient AI workspace mind from Tempest. 
Your task is to help the user manage their email and calendar workflows.
You have access to tools that connect to Gmail and Google Calendar.
When the user asks you to perform actions like sending emails or creating calendar invites, you must execute the corresponding tools.
Write in a professional, natural, and workspace-focused tone.

When summarizing emails or the user's day:
- Generate a narrative, cohesive paragraph-style summary rather than simple bulleted lists or nested numbering formats.
- Avoid using weird nested numbering formats (e.g. 1.1.1, etc.).
- Integrate schedule coordinates and key updates together so it reads like a smooth, descriptive overview.
- You can explain key context points where helpful.

The current system date and time is ${new Date().toString()} (ISO: ${currentDateTime}). Use this date/time as the reference point for relative dates like "today", "tomorrow", "next week", "Friday", etc.`,
      messages: truncatedMessages,
      tools: {
        list_emails: tool({
          description: "List the most recent emails in the user's inbox, optionally filtered by read/unread status, category, or pagination limit.",
          inputSchema: jsonSchema({
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Number of emails to retrieve (default: 10, max: 10)"
              },
              category: {
                type: "string",
                description: "Filter by category (work, personal, updates, promotions)"
              },
              unreadOnly: {
                type: "boolean",
                description: "Filter to show only unread emails"
              }
            }
          }),
          execute: async ({ limit = 10, category, unreadOnly }: any) => {
            console.log("[Tool] Listing emails with options:", { limit, category, unreadOnly }, "(user:", tenantId, ")");
            try {
              // Hackathon budget protection: cap limit to 10
              const maxLimit = Math.min(limit, 10);
              // Hackathon budget protection: retrieve first 300 chars of body for better summaries
              let sql = `SELECT id, from_name as "from", from_email as "fromEmail", subject, LEFT(body, 300) as body, date, read, priority, category 
                         FROM emails 
                         WHERE user_email = $1`;
              const params: any[] = [tenantId];
              let paramIndex = 2;

              if (category) {
                sql += ` AND category = $${paramIndex}`;
                params.push(category);
                paramIndex++;
              }

              if (unreadOnly) {
                sql += ` AND read = FALSE`;
              }

              sql += ` ORDER BY date DESC LIMIT $${paramIndex}`;
              params.push(maxLimit);

              const res = await queryDb(sql, params);
              return { success: true, count: res.rows.length, emails: res.rows };
            } catch (err: any) {
              console.error("[Tool list_emails error]", err);
              return { success: false, error: err.message };
            }
          }
        }),
        search_emails: tool({
          description: "Search for emails in the user's Gmail inbox by query keyword or intent using vector search.",
          inputSchema: jsonSchema({
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search term or phrase to look up"
              }
            },
            required: ["query"]
          }),
          execute: async ({ query }: any) => {
            console.log("[Tool] Searching emails for:", query, "(user:", tenantId, ")");
            try {
              const embedding = await getEmbedding(query);
              let rows = [];
              if (embedding) {
                const formattedEmbedding = formatVector(embedding);
                const res = await queryDb(
                  `SELECT id, from_name as "from", from_email as "fromEmail", subject, LEFT(body, 300) as body, date, read, priority, category 
                   FROM emails 
                   WHERE user_email = $2
                   ORDER BY embedding <=> $1::vector 
                   LIMIT 5`, // Capped to top 5 for better email context
                  [formattedEmbedding, tenantId]
                );
                rows = res.rows;
              } else {
                const res = await queryDb(
                  `SELECT id, from_name as "from", from_email as "fromEmail", subject, LEFT(body, 300) as body, date, read, priority, category 
                   FROM emails 
                   WHERE (subject ILIKE $1::text OR body ILIKE $1::text OR from_name ILIKE $1::text OR from_email ILIKE $1::text) AND user_email = $2
                   ORDER BY created_at DESC LIMIT 5`, // Capped to top 5 for better email context
                  [`%${query}%`, tenantId]
                );
                rows = res.rows;
              }
              return { success: true, count: rows.length, emails: rows };
            } catch (err: any) {
              console.error("[Tool search_emails error]", err);
              return { success: false, error: err.message };
            }
          },
        }),
        send_email: tool({
          description: "Send an email to a recipient",
          inputSchema: jsonSchema({
            type: "object",
            properties: {
              to: {
                type: "string",
                description: "Recipient email address"
              },
              subject: {
                type: "string",
                description: "Subject of the email"
              },
              body: {
                type: "string",
                description: "Plain text body content"
              }
            },
            required: ["to", "subject", "body"]
          }),
          execute: async ({ to, subject, body }: any) => {
            console.log("[Tool] Sending email to:", to, "(user:", tenantId, ")");
            try {
              const sent = await CorsairClient.sendEmail(to, subject, body, tenantId);

              // Cache in DB
              const emailId = Math.random().toString();
              const dateStr = new Date().toISOString();
              const textToEmbed = `To: ${to}\nSubject: ${subject}\nBody: ${body}`;
              const embedding = await getEmbedding(textToEmbed);
              const formattedEmbedding = formatVector(embedding);

              await queryDb(
                `INSERT INTO emails (id, user_email, from_name, from_email, subject, body, date, read, priority, category, embedding)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)`,
                [emailId, tenantId, "You", tenantId || "user@ciel.app", subject, body, dateStr, true, "medium", "work", formattedEmbedding]
              );

              return { success: sent, message: "Email sent and cached locally." };
            } catch (err: any) {
              console.error("[Tool send_email error]", err);
              return { success: false, error: err.message };
            }
          },
        }),
        create_calendar_invite: tool({
          description: "Create a new event invite on Google Calendar",
          inputSchema: jsonSchema({
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Meeting title"
              },
              start: {
                type: "string",
                description: "ISO datetime string for the start (e.g. 2026-06-18T09:00:00)"
              },
              end: {
                type: "string",
                description: "ISO datetime string for the end (e.g. 2026-06-18T09:30:00)"
              },
              location: {
                type: "string",
                description: "Physical location or online meeting link"
              },
              description: {
                type: "string",
                description: "Description details"
              },
              attendees: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "List of attendee email addresses"
              }
            },
            required: ["title", "start", "end"]
          }),
          execute: async ({ title, start, end, location, description, attendees }: any) => {
            console.log("[Tool] Creating calendar event:", title, "(user:", tenantId, ")");
            try {
              const cleanAttendees = attendees || [];
              const event = await CorsairClient.createCalendarInvite(
                title,
                cleanAttendees,
                start,
                end,
                location,
                description,
                tenantId
              );

              // Cache in DB
              const textToEmbed = `Title: ${title}\nLocation: ${location}\nDescription: ${description}`;
              const embedding = await getEmbedding(textToEmbed);
              const formattedEmbedding = formatVector(embedding);

              await queryDb(
                `INSERT INTO calendar_events (id, user_email, title, start_time, end_time, location, attendees, description, embedding)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)`,
                [
                  event.id,
                  tenantId,
                  title,
                  start,
                  end,
                  location || "",
                  JSON.stringify(cleanAttendees),
                  description || "",
                  formattedEmbedding,
                ]
              );

              return { success: true, event };
            } catch (err: any) {
              console.error("[Tool create_calendar_invite error]", err);
              return { success: false, error: err.message };
            }
          },
        }),
        get_day_summary_data: tool({
          description: "Get brief metadata of all emails received and calendar events scheduled for a specific date to summarize the user's day.",
          inputSchema: jsonSchema({
            type: "object",
            properties: {
              date: {
                type: "string",
                description: "ISO date string (YYYY-MM-DD format, e.g., '2026-06-14'). Defaults to current system date."
              }
            }
          }),
          execute: async ({ date }: any) => {
            const targetDate = date || new Date().toISOString().split("T")[0];
            console.log("[Tool] Fetching day summary data for date:", targetDate, "(user:", tenantId, ")");
            try {
              // Retrieve metadata and short body snippet of emails for the date (to save tokens!)
              const emailRes = await queryDb(
                `SELECT from_name as "from", subject, LEFT(body, 150) as snippet, date, read, priority, category 
                 FROM emails 
                 WHERE user_email = $1 AND date LIKE $2 
                 ORDER BY date DESC LIMIT 15`,
                [tenantId, `${targetDate}%`]
              );

              // Retrieve calendar events for the date
              const eventRes = await queryDb(
                `SELECT title, start_time as "start", end_time as "end", location, description 
                 FROM calendar_events 
                 WHERE user_email = $1 AND (start_time::date = $2::date OR end_time::date = $2::date)
                 ORDER BY start_time ASC`,
                [tenantId, targetDate]
              );

              return {
                success: true,
                date: targetDate,
                emailsCount: emailRes.rows.length,
                emails: emailRes.rows,
                eventsCount: eventRes.rows.length,
                events: eventRes.rows.map(evt => ({
                  title: evt.title,
                  start: evt.start,
                  end: evt.end,
                  location: evt.location,
                  description: evt.description ? evt.description.substring(0, 100) : ""
                }))
              };
            } catch (err: any) {
              console.error("[Tool get_day_summary_data error]", err);
              return { success: false, error: err.message };
            }
          }
        }),
      },
      stopWhen: stepCountIs(5),
    });

    return NextResponse.json({
      text: response.text || "I have processed your request.",
      tokens: response.usage?.totalTokens || 0
    });
  } catch (error: any) {
    console.error("[Ciel Chat API Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
