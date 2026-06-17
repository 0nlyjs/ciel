import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations, chatMessages } from "@/lib/schema";
import { eq, desc, inArray, asc, and } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        tokens_used: conversations.tokensUsed,
        created_at: conversations.createdAt,
        updated_at: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.userId, session.user.id))
      .orderBy(desc(conversations.updatedAt));

    const conversationIds = rows.map((r) => r.id);
    const messagesMap: Record<string, any[]> = {};

    if (conversationIds.length > 0) {
      const allMsgs = await db
        .select({
          id: chatMessages.id,
          conversationId: chatMessages.conversationId,
          role: chatMessages.role,
          content: chatMessages.content,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(inArray(chatMessages.conversationId, conversationIds))
        .orderBy(asc(chatMessages.createdAt));

      allMsgs.forEach((msg) => {
        if (!messagesMap[msg.conversationId]) {
          messagesMap[msg.conversationId] = [];
        }
        messagesMap[msg.conversationId].push({
          id: msg.id.toString(),
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: msg.createdAt,
        });
      });
    }

    const conversationsWithMessages = rows.map((r) => ({
      ...r,
      messages: messagesMap[r.id] || [],
    }));

    return NextResponse.json({ conversations: conversationsWithMessages });
  } catch (error) {
    console.error("[Conversations API GET Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, tokens_used, messages } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 },
      );
    }

    let title = "New Conversation";
    if (Array.isArray(messages)) {
      const firstUserMessage = messages.find((m: any) => m.role === "user");
      if (firstUserMessage && typeof firstUserMessage.content === "string") {
        title = firstUserMessage.content.trim().substring(0, 255);
      }
    }

    await db
      .insert(conversations)
      .values({
        id,
        userId: session.user.id,
        tokensUsed: tokens_used || 0,
        title,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [conversations.id],
        set: {
          tokensUsed: tokens_used || 0,
          title,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Conversations API POST Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 },
      );
    }

    await db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, session.user.id),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Conversations API DELETE Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
