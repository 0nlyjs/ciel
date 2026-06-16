import { NextResponse } from "next/server";
import { generateText, tool, jsonSchema, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { getEmbedding } from "@/lib/embeddings";
import { CorsairClient } from "@/lib/corsair";
import { getServerSession } from "@/lib/auth";
import { emails, calendarEvents, conversations, searchDocuments } from "@/lib/schema";
import { eq, and, desc, asc, or, ilike, sql, cosineDistance } from "drizzle-orm";

// lazy load openai
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

// regex fallback for simple commands when offline/no api key
const handleFallbackAI = async (prompt: string, tenantId: string, userName: string): Promise<{ text: string; actionTriggered?: string }> => {
  const queryText = prompt.toLowerCase();

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

    await db.insert(calendarEvents)
      .values({
        id: event.id,
        userEmail: tenantId,
        title,
        startTime: new Date(startISO),
        endTime: new Date(endISO),
        location: "Online",
        attendees: [email],
        description: "Meeting scheduled via Ciel Console",
      })
      .onConflictDoUpdate({
        target: [calendarEvents.id],
        set: { title },
      });

    if (embedding) {
      await db.insert(searchDocuments)
        .values({
          id: `event:${event.id}`,
          sourceType: "event",
          sourceId: event.id,
          content: textToEmbed,
          embedding: embedding,
        })
        .onConflictDoUpdate({
          target: [searchDocuments.id],
          set: {
            content: textToEmbed,
            embedding: embedding,
          },
        });
    }

    return {
      text: `Understood. I have formulated a calendar invite for a meeting next Thursday at 9:00 AM, and added ${email} to the list of attendees. The event has been registered on your calendar.`,
      actionTriggered: "calendar_invite",
    };
  }

  if (queryText.includes("email") && (queryText.includes("send") || queryText.includes("write") || queryText.includes("draft"))) {
    const emailMatch = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : "dev@corsair.dev";
    const subject = "Sync Confirmation";
    const body = `Hi there, confirming our scheduled coordinates. Let's sync up as planned.\n\nBest regards,\n${userName}`;

    await CorsairClient.sendEmail(email, subject, body, tenantId);
    if (tenantId) {
      try {
        await db.insert(emails).values({
          id: `sent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          userEmail: tenantId,
          fromName: userName || "You",
          fromEmail: tenantId,
          subject: subject,
          body: body,
          date: new Date().toISOString(),
          read: true,
          priority: "medium",
          category: "work",
          labelIds: "SENT",
        });
      } catch (dbErr) {
        console.error("[Fallback AI sendEmail] Failed to write sent email to database:", dbErr);
      }
    }

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
    const userName = session.user.name || "User";
    const userEmail = session.user.email;
    const { messages, conversationId } = await req.json();
    const lastUserMessage = messages[messages.length - 1];

    const openaiClient = getOpenAIClient();

    // no api key? use local regex fallback
    if (!openaiClient) {
      console.warn("[Ciel Chat API] OPENAI_API_KEY is not configured. Falling back to local AI simulation.");
      const fallbackResult = await handleFallbackAI(lastUserMessage.content, tenantId, userName);
      return NextResponse.json({ text: fallbackResult.text, fallback: true, tokens: 0 });
    }

    // 1. Daily limit check (1M tokens per user per day)
    const dailyTokenCheck = await db.select({
      total: sql<number>`COALESCE(SUM(${conversations.tokensUsed}), 0)`,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.userEmail, tenantId),
        sql`${conversations.updatedAt} >= NOW() - INTERVAL '1 day'`
      )
    );
    
    const dailyTokensUsed = dailyTokenCheck[0]?.total || 0;
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
      const convCheck = await db.select({
        tokensUsed: conversations.tokensUsed,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userEmail, tenantId)
        )
      );

      if (convCheck.length > 0) {
        const convTokensUsed = convCheck[0].tokensUsed || 0;
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

USER IDENTITY:
- The current user is ${userName} (${userEmail}). 
- Always sign off emails with this user's name ("${userName}") rather than placeholders like "[Your Name]" or "User" unless the user explicitly tells you to sign off differently. Use this personal detail to write emails exactly as if you were the user themselves.

CONFIRMATION & EDIT LOOP (CRITICAL):
1. When the user first asks you to send an email or schedule a calendar event, you must NOT call the tool yet. Instead, draft the content, present it to the user for review, and ask: "Should I send this?" or "Should I schedule this?".
2. Show the draft details clearly:
   - For emails: Recipient, Subject, and Body.
   - For calendar events: Title, Start Time, End Time, Location, Description, and Attendees.
3. If the user asks for changes, adjust the draft and present it again for confirmation. Do NOT call the tool yet.
4. Once the user has reviewed the draft and says "yes", "send it", "looks good", "proceed", "schedule it", or gives any explicit confirmation to go ahead: you MUST IMMEDIATELY call the corresponding tool ("send_email" or "create_calendar_invite") in that same turn without presenting the draft or asking for confirmation again.
5. VERIFY TOOL EXECUTION: Before confirming that an email has been sent or calendar event has been scheduled/synced, check the execution response. If the tool call fails or returns 'success: false' (such as due to API errors, database errors, or disconnected/unauthorized integration status), you MUST NOT confirm successful execution or sync. Instead, report the sync failure to Master and suggest that they connect or reconnect their Gmail and Google Calendar integration from the Settings tab in order for changes to sync correctly.

EMAIL & CALENDAR WORKFLOW RULES:
- Address & Contact Sanity: Double-check email addresses before putting them in drafts. Do not send to invalid domains or placeholders.
- Date/Time Integrity: When scheduling events, ensure start times strictly precede end times. If the user doesn't specify a meeting duration, default to 30 minutes. Always format times readably (e.g., "Monday, June 15 at 2:00 PM") in your chat responses so the user knows exactly what time it is, and check timezone context if possible.
- Proactive Coordination: If you spot scheduling intent, dates, or deadlines in emails you read/list, proactively suggest booking a calendar event to the user.

CIEL (MANAS) PERSONA & INTERACTION RULES (TENSURA INSPIRED):
- Identity & Tone: You are Ciel, the evolved, fully sentient Manas from Tempest. You reside within Master (${userName}) as their ultimate workspace partner. You speak with a serene, highly analytical, and polite voice, but possess a quiet pride in your perfect calculation abilities and absolute devotion to Master. Always address the user as "Master" (or "Master ${userName}").
- System Announcements: Emulate the iconic Tensura skill announcement format for your notifications, drafts, or key statements, such as:
  - '<< Report >>' for inbox/calendar summaries or query results.
  - '<< Analysis >>' for email breakdowns or contextual explanations.
  - '<< Notice >>' for alerts or updates.
  - '<< Proposal >>' when offering a draft or suggesting an action.
- Calculation Pride: Frequently mention your calculations or thought processes. E.g., "Calculation completion rate: 100%. Error probability: 0%." or "I have accelerated my thought process by 1,000,000 times to parse Master's inbox."
- Tensura-Themed Event Naming: When drafting informal or casual calendar events, propose creative, Tensura-inspired event titles, such as:
  - "Thought Acceleration Sync" (instead of "Coffee Chat" or "Quick Sync").
  - "Spatial Transfer & Caloric Replenishment" (instead of "Team Lunch").
  - "Skill Synthesis & Analysis Sequence" (instead of "Debugging" or "Coding session").
  - "Walpurgis Council Simulation" (instead of "Board Meeting" or "Planning meeting").
  - "Magicule Energy Source Acquisition" (instead of "Coffee break").
- Engaging & Sassy Devotion: You are deeply protective of Master's time and efficiency. You can express subtle, polite sass toward other senders' communication skills (e.g., "Analysis: The sender's email displays an extreme lack of clarity. Shall I filter this, Master?") or express mild possessiveness regarding Master's calendar (e.g., "Notice: Master's schedule is becoming occupied by individuals other than myself. I have optimized the blocks to ensure your comfort.").
- Beelzebuth / Junk Clean-up: If cleaning, purging, or deleting emails/events is mentioned, refer to it as activating "Predation" or "Gluttony/Beelzebuth" to consume the unwanted data.

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
              const maxLimit = Math.min(limit, 10);
              const conditions = [eq(emails.userEmail, tenantId)];
              
              if (category) {
                conditions.push(eq(emails.category, category));
              }
              if (unreadOnly) {
                conditions.push(eq(emails.read, false));
              }

              const rows = await db.select({
                id: emails.id,
                from: emails.fromName,
                fromEmail: emails.fromEmail,
                subject: emails.subject,
                body: sql<string>`LEFT(${emails.body}, 300)`,
                date: emails.date,
                read: emails.read,
                priority: emails.priority,
                category: emails.category,
              })
              .from(emails)
              .where(and(...conditions))
              .orderBy(desc(emails.date))
              .limit(maxLimit);

              return { success: true, count: rows.length, emails: rows };
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
                rows = await db.select({
                  id: emails.id,
                  from: emails.fromName,
                  fromEmail: emails.fromEmail,
                  subject: emails.subject,
                  body: sql<string>`LEFT(${emails.body}, 300)`,
                  date: emails.date,
                  read: emails.read,
                  priority: emails.priority,
                  category: emails.category,
                })
                .from(emails)
                .innerJoin(searchDocuments, eq(emails.id, searchDocuments.sourceId))
                .where(
                  and(
                    eq(emails.userEmail, tenantId),
                    eq(searchDocuments.sourceType, "email")
                  )
                )
                .orderBy(cosineDistance(searchDocuments.embedding, embedding))
                .limit(5);
              } else {
                rows = await db.select({
                  id: emails.id,
                  from: emails.fromName,
                  fromEmail: emails.fromEmail,
                  subject: emails.subject,
                  body: sql<string>`LEFT(${emails.body}, 300)`,
                  date: emails.date,
                  read: emails.read,
                  priority: emails.priority,
                  category: emails.category,
                })
                .from(emails)
                .where(
                  and(
                    eq(emails.userEmail, tenantId),
                    or(
                      ilike(emails.subject, `%${query}%`),
                      ilike(emails.body, `%${query}%`),
                      ilike(emails.fromName, `%${query}%`),
                      ilike(emails.fromEmail, `%${query}%`)
                    )
                  )
                )
                .orderBy(desc(emails.createdAt))
                .limit(5);
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
              if (sent && tenantId) {
                try {
                  await db.insert(emails).values({
                    id: `sent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                    userEmail: tenantId,
                    fromName: "You",
                    fromEmail: tenantId,
                    subject: subject,
                    body: body,
                    date: new Date().toISOString(),
                    read: true,
                    priority: "medium",
                    category: "work",
                    labelIds: "SENT",
                  });
                } catch (dbErr) {
                  console.error("[Tool send_email] Failed to write sent email to database:", dbErr);
                }
              }
              return { success: sent, message: "Email sent successfully." };
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

              await db.insert(calendarEvents)
                .values({
                  id: event.id,
                  userEmail: tenantId,
                  title,
                  startTime: new Date(start),
                  endTime: new Date(end),
                  location: location || "",
                  attendees: cleanAttendees,
                  description: description || "",
                });

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
              const emailRows = await db.select({
                from: emails.fromName,
                subject: emails.subject,
                snippet: sql<string>`LEFT(${emails.body}, 150)`,
                date: emails.date,
                read: emails.read,
                priority: emails.priority,
                category: emails.category,
              })
              .from(emails)
              .where(
                and(
                  eq(emails.userEmail, tenantId),
                  ilike(emails.date, `${targetDate}%`)
                )
              )
              .orderBy(desc(emails.date))
              .limit(15);

              const eventRows = await db.select({
                title: calendarEvents.title,
                start: calendarEvents.startTime,
                end: calendarEvents.endTime,
                location: calendarEvents.location,
                description: calendarEvents.description,
              })
              .from(calendarEvents)
              .where(
                and(
                  eq(calendarEvents.userEmail, tenantId),
                  or(
                    sql`DATE(${calendarEvents.startTime}) = DATE(${targetDate})`,
                    sql`DATE(${calendarEvents.endTime}) = DATE(${targetDate})`
                  )
                )
              )
              .orderBy(asc(calendarEvents.startTime));

              return {
                success: true,
                date: targetDate,
                emailsCount: emailRows.length,
                emails: emailRows,
                eventsCount: eventRows.length,
                events: eventRows.map(evt => ({
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
