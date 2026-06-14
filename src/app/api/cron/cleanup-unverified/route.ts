import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq, and, lt } from "drizzle-orm";

export async function GET(req: Request) {
  // Optional query param authorization
  const { searchParams } = new URL(req.url);
  const cronSecret = searchParams.get("secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Clean up users where verified is false and they were created more than 24 hours ago
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db
      .delete(users)
      .where(
        and(
          eq(users.verified, false),
          lt(users.createdAt, oneDayAgo)
        )
      )
      .returning({ id: users.id, email: users.email });

    return NextResponse.json({
      success: true,
      message: "Unverified users cleanup completed.",
      deletedUsersCount: result.length,
      deletedUsers: result,
    });
  } catch (error: any) {
    console.error("Cron cleanup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
