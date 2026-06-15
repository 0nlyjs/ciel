import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

export async function POST(req: Request) {
  try {
    const { input, currentEmailId } = await req.json();
    const client = getOpenAIClient();
    if (!client) {
      return NextResponse.json({ error: "OpenAI is not configured." }, { status: 500 });
    }

    const prompt = `You are the command interpreter for Ciel, a personal workspace assistant.
Parse the user's natural language command into a structured action.

Command: "${input}"
Current Email ID in focus: "${currentEmailId || ""}"

Respond with a raw JSON object conforming to this schema:
{
  "action": "snooze" | "mark_read" | "compose" | "search" | "navigate" | "clear_chat" | "unknown",
  "params": {
    "emailId": string (pass the current email ID if the command refers to "this", "it", or "this email"),
    "date": string (ISO string or relative date description e.g. "tomorrow", "next Monday"),
    "to": string (for compose, e.g. a recipient email address),
    "subject": string (for compose, e.g. subject line),
    "body": string (for compose, e.g. body text),
    "query": string (for search, e.g. vector search keyword/phrase),
    "tab": "overview" | "inbox" | "calendar" | "chat" | "settings" (for navigation)
  }
}

Do not wrap in markdown code blocks.`;

    const { text } = await generateText({
      model: client("gpt-4o-mini"),
      prompt,
    });

    const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    return NextResponse.json({ success: true, command: parsed });
  } catch (error: any) {
    console.error("[Command API Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
