import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { emails, calendarEvents, conversations } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete emails, calendar events, and chat conversations
    await db.delete(emails).where(eq(emails.userId, userId));
    await db.delete(calendarEvents).where(eq(calendarEvents.userId, userId));
    await db.delete(conversations).where(eq(conversations.userId, userId));

    return NextResponse.json({
      success: true,
      message: "Local workspace data deleted successfully.",
    });
  } catch (error: any) {
    console.error("[Profile Clear Data Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}
