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
    const { messages } = await req.json();
    const lastUserMessage = messages[messages.length - 1];

    const openaiClient = getOpenAIClient();

    // no api key? use local regex fallback
    if (!openaiClient) {
      console.warn("[Ciel Chat API] OPENAI_API_KEY is not configured. Falling back to local AI simulation.");
      const fallbackResult = await handleFallbackAI(lastUserMessage.content, tenantId);
      return NextResponse.json({ text: fallbackResult.text, fallback: true, tokens: 0 });
    }

    await dbInit();

    // run vercel ai sdk with tools using tool() and jsonSchema() wrappers
    const currentDateTime = new Date().toISOString();
    const response = await generateText({
      model: openaiClient.chat("gpt-4o-mini"),
      system: `You are Ciel, the sentient AI workspace mind from Tempest. 
Your task is to help the user manage their email and calendar workflows.
You have access to tools that connect to Gmail and Google Calendar.
When the user asks you to perform actions like sending emails or creating calendar invites, you must execute the corresponding tools.
Always answer in a precise, helpful, and slightly robotic/analytical tone.

The current system date and time is ${new Date().toString()} (ISO: ${currentDateTime}). Use this date/time as the reference point for relative dates like "today", "tomorrow", "next week", "Friday", etc.`,
      messages: messages,
      tools: {
        list_emails: tool({
          description: "List the most recent emails in the user's inbox, optionally filtered by read/unread status, category, or pagination limit.",
          inputSchema: jsonSchema({
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Number of emails to retrieve (default: 10, max: 50)"
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
              const maxLimit = Math.min(limit, 50);
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
                  `SELECT id, from_name as "from", from_email as "fromEmail", subject, LEFT(body, 1000) as body, date, read, priority, category 
                   FROM emails 
                   WHERE user_email = $2
                   ORDER BY embedding <=> $1::vector 
                   LIMIT 5`,
                  [formattedEmbedding, tenantId]
                );
                rows = res.rows;
              } else {
                const res = await queryDb(
                  `SELECT id, from_name as "from", from_email as "fromEmail", subject, LEFT(body, 1000) as body, date, read, priority, category 
                   FROM emails 
                   WHERE (subject ILIKE $1::text OR body ILIKE $1::text OR from_name ILIKE $1::text OR from_email ILIKE $1::text) AND user_email = $2
                   ORDER BY created_at DESC LIMIT 5`,
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
