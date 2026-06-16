import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calendarEvents } from "@/lib/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    // 1. Validate Session Identity
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    // 2. Extract Time Window (Defaults to roughly a 60-day operational view)
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const startDate = startParam
      ? new Date(startParam)
      : new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const endDate = endParam
      ? new Date(endParam)
      : new Date(Date.now() + 45 * 24 * 60 * 60 * 1000); // 45 days forward

    // 3. Build highly-indexed query conditions
    const conditions = [
      eq(calendarEvents.userId, userId),
      gte(calendarEvents.startTime, startDate),
      lte(calendarEvents.startTime, endDate),
    ];

    // 4. Fetch instantly from the local Neon cache hitting idx_calendar_user_time
    const data = await db
      .select()
      .from(calendarEvents)
      .where(and(...conditions))
      .orderBy(asc(calendarEvents.startTime));

    return NextResponse.json(
      {
        data,
        totalReturned: data.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API CALENDAR GET] Failed to fetch schedule:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
