import { streamText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { getEmbedding } from "@/lib/embeddings";
import { CorsairClient } from "@/lib/corsair";
import { auth } from "@/lib/auth";
import {
  emails,
  calendarEvents,
  conversations,
  chatMessages,
  searchDocuments,
} from "@/lib/schema";
import {
  eq,
  and,
  desc,
  asc,
  or,
  ilike,
  sql,
  cosineDistance,
} from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod/v4";

// Allow streaming responses up to 30 seconds for complex agent loops
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name || "User";
    const {
      messages,
      conversationId,
    }: { messages: any[]; conversationId: string } = await req.json();

    if (!conversationId) {
      return new Response("Missing conversationId", { status: 400 });
    }

    // 1. Token Budget Check (O(1) Indexed Lookup)
    const [convo] = await db
      .select({ tokensUsed: conversations.tokensUsed })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId),
        ),
      )
      .limit(1);

    if (!convo) {
      return new Response("Conversation not found.", { status: 404 });
    }

    if (convo.tokensUsed > 100000) {
      return new Response("Token limit reached for this conversation.", {
        status: 429,
      });
    }

    // Sliding window: only send the last 6 messages to the LLM to keep tokens low
    const truncatedMessages = messages.slice(-6);

    const currentDateTime = new Date().toISOString();

    // 2. Stream Setup with Agentic Loop
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: `You are Ciel, the sentient AI workspace mind from Tempest.
Your task is to help the user manage their email and calendar workflows.
You have access to tools that connect to Gmail and Google Calendar.
You have direct access to the user's local, high-speed PostgreSQL cache of their Gmail and Google Calendar.
Do not ask permission to read data, just execute the tools to find the answer.

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
      stopWhen: [stepCountIs(5)],
      tools: {
        list_emails: tool({
          description:
            "List the most recent emails in the user's inbox, optionally filtered by read/unread status, category, or pagination limit.",
          inputSchema: z.object({
            limit: z.number().max(10).optional().default(10),
            category: z
              .enum(["work", "personal", "updates", "promotions"])
              .optional(),
            unreadOnly: z.boolean().optional(),
          }),
          execute: async ({ limit, category, unreadOnly }) => {
            const limitVal = limit ?? 10;
            console.log(
              "[Tool] Listing emails with options:",
              { limit: limitVal, category, unreadOnly },
              "(userId:",
              userId,
              ")",
            );
            try {
              const maxLimit = Math.min(limitVal, 10);
              const conditions: any[] = [eq(emails.userId, userId)];

              if (category) {
                conditions.push(eq(emails.category, category));
              }
              if (unreadOnly) {
                conditions.push(eq(emails.read, false));
              }

              const rows = await db
                .select({
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
          },
        }),
        search_emails: tool({
          description:
            "Search for emails in the user's Gmail inbox by query keyword or intent using vector search.",
          inputSchema: z.object({
            query: z.string().describe("The search term or phrase to look up"),
          }),
          execute: async ({ query }) => {
            console.log(
              "[Tool] Searching emails for:",
              query,
              "(userId:",
              userId,
              ")",
            );
            try {
              const embedding = await getEmbedding(query);
              let rows = [];
              if (embedding) {
                rows = await db
                  .select({
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
                  .innerJoin(
                    searchDocuments,
                    eq(emails.id, searchDocuments.sourceId),
                  )
                  .where(
                    and(
                      eq(emails.userId, userId),
                      eq(searchDocuments.sourceType, "email"),
                    ),
                  )
                  .orderBy(cosineDistance(searchDocuments.embedding, embedding))
                  .limit(5);
              } else {
                rows = await db
                  .select({
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
                      eq(emails.userId, userId),
                      or(
                        ilike(emails.subject, `%${query}%`),
                        ilike(emails.body, `%${query}%`),
                        ilike(emails.fromName, `%${query}%`),
                        ilike(emails.fromEmail, `%${query}%`),
                      ),
                    ),
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
          description: "Send an email to a recipient via Gmail API",
          inputSchema: z.object({
            to: z.string().describe("Recipient email address"),
            subject: z.string().describe("Subject of the email"),
            body: z.string().describe("Plain text body content"),
          }),
          execute: async ({ to, subject, body }) => {
            console.log(
              "[Tool] Sending email to:",
              to,
              "(userId:",
              userId,
              ")",
            );
            try {
              const sent = await CorsairClient.sendEmail(
                to,
                subject,
                body,
                userEmail,
              );
              if (sent && userEmail) {
                try {
                  await db.insert(emails).values({
                    id: `sent-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                    userId,
                    fromName: userName || "You",
                    fromEmail: userEmail,
                    subject,
                    body,
                    date: new Date(),
                    read: true,
                    priority: "medium",
                    category: "work",
                    labelIds: "SENT",
                  });
                } catch (dbErr) {
                  console.error(
                    "[Tool send_email] Failed to write sent email to database:",
                    dbErr,
                  );
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
          inputSchema: z.object({
            title: z.string().describe("Meeting title"),
            start: z
              .string()
              .describe(
                "ISO datetime string for the start (e.g. 2026-06-18T09:00:00)",
              ),
            end: z
              .string()
              .describe(
                "ISO datetime string for the end (e.g. 2026-06-18T09:30:00)",
              ),
            location: z
              .string()
              .optional()
              .describe("Physical location or online meeting link"),
            description: z.string().optional().describe("Description details"),
            attendees: z
              .array(z.string())
              .optional()
              .describe("List of attendee email addresses"),
          }),
          execute: async ({
            title,
            start,
            end,
            location,
            description,
            attendees,
          }) => {
            console.log(
              "[Tool] Creating calendar event:",
              title,
              "(userId:",
              userId,
              ")",
            );
            try {
              const cleanAttendees = attendees || [];
              const event = await CorsairClient.createCalendarInvite(
                title,
                cleanAttendees,
                start,
                end,
                location || "",
                description || "",
                userEmail,
              );

              await db
                .insert(calendarEvents)
                .values({
                  id: event?.id || `cal-${Date.now()}`,
                  userId,
                  title,
                  startTime: new Date(start),
                  endTime: new Date(end),
                  location: location || "",
                  attendees: cleanAttendees,
                  description: description || "",
                })
                .onConflictDoUpdate({
                  target: [calendarEvents.id],
                  set: {
                    title,
                    startTime: new Date(start),
                    endTime: new Date(end),
                  },
                });

              return { success: true, event };
            } catch (err: any) {
              console.error("[Tool create_calendar_invite error]", err);
              return { success: false, error: err.message };
            }
          },
        }),
        get_day_summary_data: tool({
          description:
            "Get brief metadata of all emails received and calendar events scheduled for a specific date to summarize the user's day.",
          inputSchema: z.object({
            date: z
              .string()
              .optional()
              .describe(
                "ISO date string (YYYY-MM-DD format, e.g., '2026-06-14'). Defaults to current system date.",
              ),
          }),
          execute: async ({ date }) => {
            const targetDate = date || new Date().toISOString().split("T")[0];
            console.log(
              "[Tool] Fetching day summary data for date:",
              targetDate,
              "(userId:",
              userId,
              ")",
            );
            try {
              const emailRows = await db
                .select({
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
                    eq(emails.userId, userId),
                    ilike(emails.date, `${targetDate}%`),
                  ),
                )
                .orderBy(desc(emails.date))
                .limit(15);

              const eventRows = await db
                .select({
                  title: calendarEvents.title,
                  start: calendarEvents.startTime,
                  end: calendarEvents.endTime,
                  location: calendarEvents.location,
                  description: calendarEvents.description,
                })
                .from(calendarEvents)
                .where(
                  and(
                    eq(calendarEvents.userId, userId),
                    or(
                      sql`DATE(${calendarEvents.startTime}) = DATE(${targetDate})`,
                      sql`DATE(${calendarEvents.endTime}) = DATE(${targetDate})`,
                    ),
                  ),
                )
                .orderBy(asc(calendarEvents.startTime));

              return {
                success: true,
                date: targetDate,
                emailsCount: emailRows.length,
                emails: emailRows,
                eventsCount: eventRows.length,
                events: eventRows.map((evt) => ({
                  title: evt.title,
                  start: evt.start,
                  end: evt.end,
                  location: evt.location,
                  description: evt.description
                    ? evt.description.substring(0, 100)
                    : "",
                })),
              };
            } catch (err: any) {
              console.error("[Tool get_day_summary_data error]", err);
              return { success: false, error: err.message };
            }
          },
        }),
      },
      onFinish: async (event) => {
        // 3. Background Persistence (Zero blocking on the frontend stream)
        const { usage, response } = event;

        // Map the generated assistant messages and tool executions to normalized chat_messages
        const newMessages = response.messages.map((msg) => ({
          conversationId,
          role: msg.role,
          content:
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content),
        }));

        // Include the user's initiating message
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage) {
          newMessages.unshift({
            conversationId,
            role: lastUserMessage.role,
            content:
              typeof lastUserMessage.content === "string"
                ? lastUserMessage.content
                : JSON.stringify(lastUserMessage.content),
          });
        }

        // Atomic batch insert to normalized tables to prevent JSONB row bloat
        await db.transaction(async (tx) => {
          if (newMessages.length > 0) {
            await tx.insert(chatMessages).values(newMessages);
          }
          await tx
            .update(conversations)
            .set({ tokensUsed: convo.tokensUsed + (usage.totalTokens ?? 0) })
            .where(eq(conversations.id, conversationId));
        });
      },
    });

    // 4. Return the streaming pipeline instantly
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[API CHAT] Streaming pipeline failed:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
