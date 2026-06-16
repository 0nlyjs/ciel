import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversations } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

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

    return NextResponse.json({ conversations: rows });
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

    const { id, tokens_used } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 },
      );
    }

    await db
      .insert(conversations)
      .values({
        id,
        userId: session.user.id,
        tokensUsed: tokens_used || 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [conversations.id],
        set: {
          tokensUsed: tokens_used || 0,
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
