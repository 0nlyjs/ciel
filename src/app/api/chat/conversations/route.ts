import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { dbInit, query } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();
    const res = await query(
      "SELECT id, title, messages, tokens_used, created_at, updated_at FROM conversations WHERE user_email = $1 ORDER BY updated_at DESC",
      [session.user.email]
    );
    return NextResponse.json({ conversations: res.rows });
  } catch (error) {
    console.error("[Conversations API GET Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, messages, tokens_used } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 });
    }

    await dbInit();

    // Determine title from the first user message if possible
    let title = "New Conversation";
    if (messages && messages.length > 0) {
      const firstUserMsg = messages.find((m: any) => m.role === "user");
      if (firstUserMsg && firstUserMsg.content) {
        title = firstUserMsg.content.substring(0, 45).trim();
        if (firstUserMsg.content.length > 45) title += "...";
      }
    }

    await query(
      `INSERT INTO conversations (id, user_email, title, messages, tokens_used, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         messages = EXCLUDED.messages,
         title = EXCLUDED.title,
         tokens_used = EXCLUDED.tokens_used,
         updated_at = CURRENT_TIMESTAMP`,
      [id, session.user.email, title, JSON.stringify(messages), tokens_used || 0]
    );

    return NextResponse.json({ success: true, title });
  } catch (error) {
    console.error("[Conversations API POST Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
