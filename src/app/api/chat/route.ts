/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

// lazy load openai to avoid throwing when API key is missing
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

// regex fallback for simple commands when offline/no api key
const handleFallbackAI = (prompt: string): { text: string; actionTriggered?: string } => {
  const query = prompt.toLowerCase();
  
  if (query.includes("calendar") && (query.includes("invite") || query.includes("send") || query.includes("schedule"))) {
    // try to grab email and time
    const emailMatch = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : "dev@corsair.dev";
    
    return {
      text: `Understood. I have formulated a calendar invite for a meeting next Thursday at 9:00 AM, and added ${email} to the list of attendees. The event has been registered on your calendar.`,
      actionTriggered: "calendar_invite",
    };
  }

  if (query.includes("email") && (query.includes("send") || query.includes("write") || query.includes("draft"))) {
    const emailMatch = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : "dev@corsair.dev";
    
    return {
      text: `Acknowledged. I have drafted and sent the email to ${email} confirming our synchronization and schedule.`,
      actionTriggered: "email_sent",
    };
  }

  if (query.includes("search") || query.includes("find")) {
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
      const fallbackResult = handleFallbackAI(lastUserMessage.content);
      return NextResponse.json({ text: fallbackResult.text, fallback: true });
    }

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
          description: "Search for emails in the user's Gmail inbox by query keyword",
          parameters: z.object({
            query: z.string().describe("The search term or phrase"),
          }),
          execute: async ({ query }: any) => {
            console.log("[Tool] Searching emails for:", query);
            return { success: true, count: 5 };
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
            return { success: true };
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
            return { success: true };
          },
        },
      } as any,
      maxSteps: 3, // let model execute tool-calls in loop if needed
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
