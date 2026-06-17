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
    const userEmail = session.user.email;
    const { searchParams } = new URL(req.url);

    // Sync Strategy: Only sync calendar events when sync=true is explicitly passed
    const syncParam = searchParams.get("sync");
    if (syncParam === "true" && userEmail) {
      console.log(`[API CALENDAR GET] Triggering blocking calendar sync for ${userEmail}...`);
      try {
        const { syncCalendarEvents } = await import("@/lib/sync");
        await syncCalendarEvents(userId, userEmail);
      } catch (syncErr) {
        console.error("[API CALENDAR GET] Blocking calendar sync error:", syncErr);
      }
    }

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
    const rows = await db
      .select()
      .from(calendarEvents)
      .where(and(...conditions))
      .orderBy(asc(calendarEvents.startTime));

    // Map database columns to the frontend interface (startTime -> start, endTime -> end)
    const data = rows.map((row) => ({
      id: row.id,
      title: row.title,
      start: row.startTime.toISOString(),
      end: row.endTime.toISOString(),
      location: row.location || "",
      attendees: row.attendees || [],
      description: row.description || "",
      contextTag: row.contextTag,
    }));

    return NextResponse.json(
      {
        data,
        calendarEvents: data,
        totalReturned: data.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API CALENDAR GET] Failed to fetch schedule:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
