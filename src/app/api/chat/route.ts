/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { dbInit, query } from "@/lib/db";
import { getEmbedding, formatVector } from "@/lib/embeddings";
import { CorsairClient } from "@/lib/corsair";

// lazy load openai
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

// regex fallback for simple commands when offline/no api key
const handleFallbackAI = async (prompt: string): Promise<{ text: string; actionTriggered?: string }> => {
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

    const event = await CorsairClient.createCalendarInvite(title, [email], startISO, endISO, "Online", "Meeting scheduled via Ciel Console");

    // Cache in DB
    const textToEmbed = `Title: ${title}\nLocation: Online\nDescription: Meeting scheduled via Ciel Console`;
    const embedding = await getEmbedding(textToEmbed);
    const formattedEmbedding = formatVector(embedding);

    await query(
      `INSERT INTO calendar_events (id, title, start_time, end_time, location, attendees, description, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`,
      [event.id, title, startISO, endISO, "Online", JSON.stringify([email]), "Meeting scheduled via Ciel Console", formattedEmbedding]
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

    await CorsairClient.sendEmail(email, subject, body);

    // Cache in DB
    const textToEmbed = `To: ${email}\nSubject: ${subject}\nBody: ${body}`;
    const embedding = await getEmbedding(textToEmbed);
    const formattedEmbedding = formatVector(embedding);

    await query(
      `INSERT INTO emails (id, from_name, from_email, subject, body, date, read, priority, category, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)
       ON CONFLICT (id) DO UPDATE SET subject = EXCLUDED.subject`,
      [
        Math.random().toString(),
        "You",
        "user@ciel.app",
        subject,
        body,
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
    const { messages } = await req.json();
    const lastUserMessage = messages[messages.length - 1];

    const openaiClient = getOpenAIClient();

    // no api key? use local regex fallback
    if (!openaiClient) {
      console.warn("[Ciel Chat API] OPENAI_API_KEY is not configured. Falling back to local AI simulation.");
      const fallbackResult = await handleFallbackAI(lastUserMessage.content);
      return NextResponse.json({ text: fallbackResult.text, fallback: true });
    }

    await dbInit();

    // run vercel ai sdk with tools
    const response = await (generateText as any)({
      model: openaiClient("gpt-4o-mini"),
      system: `You are Ciel, the sentient AI workspace mind from Tempest. 
Your task is to help the user manage their email and calendar workflows.
You have access to tools that connect to Gmail and Google Calendar.
When the user asks you to perform actions like sending emails or creating calendar invites, you must execute the corresponding tools.
Always answer in a precise, helpful, and slightly robotic/analytical tone.`,
      messages: messages,
      tools: {
        search_emails: {
          description: "Search for emails in the user's Gmail inbox by query keyword or intent using vector search.",
          parameters: z.object({
            query: z.string().describe("The search term or phrase"),
          }),
          execute: async ({ query: q }: any) => {
            console.log("[Tool] Searching emails for:", q);
            try {
              const embedding = await getEmbedding(q);
              let rows = [];
              if (embedding) {
                const formattedEmbedding = formatVector(embedding);
                const res = await query(
                  `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
                   FROM emails 
                   ORDER BY embedding <=> $1::vector 
                   LIMIT 5`,
                  [formattedEmbedding]
                );
                rows = res.rows;
              } else {
                const res = await query(
                  `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
                   FROM emails 
                   WHERE subject ILIKE $1 OR body ILIKE $1 OR from_name ILIKE $1 OR from_email ILIKE $1 
                   ORDER BY created_at DESC LIMIT 5`,
                  [`%${q}%`]
                );
                rows = res.rows;
              }
              return { success: true, count: rows.length, emails: rows };
            } catch (err: any) {
              console.error("[Tool search_emails error]", err);
              return { success: false, error: err.message };
            }
          },
        },
        send_email: {
          description: "Send an email to a recipient",
          parameters: z.object({
            to: z.string().email().describe("Recipient email address"),
            subject: z.string().describe("Subject of the email"),
            body: z.string().describe("Plain text body content"),
          }),
          execute: async ({ to, subject, body }: any) => {
            console.log("[Tool] Sending email to:", to);
            try {
              const sent = await CorsairClient.sendEmail(to, subject, body);

              // Cache in DB
              const emailId = Math.random().toString();
              const dateStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const textToEmbed = `To: ${to}\nSubject: ${subject}\nBody: ${body}`;
              const embedding = await getEmbedding(textToEmbed);
              const formattedEmbedding = formatVector(embedding);

              await query(
                `INSERT INTO emails (id, from_name, from_email, subject, body, date, read, priority, category, embedding)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)`,
                [emailId, "You", "user@ciel.app", subject, body, dateStr, true, "medium", "work", formattedEmbedding]
              );

              return { success: sent, message: "Email sent and cached locally." };
            } catch (err: any) {
              console.error("[Tool send_email error]", err);
              return { success: false, error: err.message };
            }
          },
        },
        create_calendar_invite: {
          description: "Create a new event invite on Google Calendar",
          parameters: z.object({
            title: z.string().describe("Meeting title"),
            start: z.string().describe("ISO datetime string for the start (e.g. 2026-06-18T09:00:00)"),
            end: z.string().describe("ISO datetime string for the end (e.g. 2026-06-18T09:30:00)"),
            location: z.string().optional().describe("Physical location or online meeting link"),
            description: z.string().optional().describe("Description details"),
            attendees: z.array(z.string().email()).optional().describe("List of attendee email addresses"),
          }),
          execute: async ({ title, start, end, location, description, attendees }: any) => {
            console.log("[Tool] Creating calendar event:", title);
            try {
              const cleanAttendees = attendees || [];
              const event = await CorsairClient.createCalendarInvite(
                title,
                cleanAttendees,
                start,
                end,
                location,
                description
              );

              // Cache in DB
              const textToEmbed = `Title: ${title}\nLocation: ${location}\nDescription: ${description}`;
              const embedding = await getEmbedding(textToEmbed);
              const formattedEmbedding = formatVector(embedding);

              await query(
                `INSERT INTO calendar_events (id, title, start_time, end_time, location, attendees, description, embedding)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)`,
                [
                  event.id,
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
        },
      } as any,
      maxSteps: 3,
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("[Ciel Chat API Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
