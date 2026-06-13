import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db.select({
      id: conversations.id,
      title: conversations.title,
      messages: conversations.messages,
      tokens_used: conversations.tokensUsed,
      created_at: conversations.createdAt,
      updated_at: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userEmail, session.user.email))
    .orderBy(desc(conversations.updatedAt));

    return NextResponse.json({ conversations: rows });
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

    // Determine title from the first user message if possible
    let title = "New Conversation";
    if (messages && messages.length > 0) {
      const firstUserMsg = messages.find((m: any) => m.role === "user");
      if (firstUserMsg && firstUserMsg.content) {
        title = firstUserMsg.content.substring(0, 45).trim();
        if (firstUserMsg.content.length > 45) title += "...";
      }
    }

    await db.insert(conversations)
      .values({
        id,
        userEmail: session.user.email,
        title,
        messages: messages || [],
        tokensUsed: tokens_used || 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [conversations.id],
        set: {
          messages: messages || [],
          title,
          tokensUsed: tokens_used || 0,
          updatedAt: new Date(),
        }
      });

    return NextResponse.json({ success: true, title });
  } catch (error) {
    console.error("[Conversations API POST Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
