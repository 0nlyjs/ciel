import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails } from "@/lib/schema";
import { eq, and, desc, lt, ilike, or, not, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: Request) {
  try {
    // 1. High-Speed Session Extraction
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);

    // Extract Query Parameters
    const cursor = searchParams.get("cursor"); // ISO Timestamp of the last loaded email
    const folder = searchParams.get("folder") || "inbox";
    const searchQuery = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // 2. Build the Dynamic Index-Optimized Query
    const conditions = [eq(emails.userId, userId)];

    // Apply Cursor (O(1) offset targeting via idx_emails_user_date)
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        conditions.push(lt(emails.date, cursorDate));
      }
    }

    // Apply Folder Filtering
    if (folder === "sent") {
      conditions.push(sql`${ilike(emails.labelIds, "%SENT%")}`);
    } else if (folder === "inbox") {
      conditions.push(
        sql`${or(sql`${emails.labelIds} IS NULL`, not(ilike(emails.labelIds, "%SENT%")))}
        `,
      );
    }

    // Apply Native ILIKE Search (Vector search is handled by a separate route)
    if (searchQuery) {
      conditions.push(
        sql`${or(
          ilike(emails.subject, `%${searchQuery}%`),
          ilike(emails.fromName, `%${searchQuery}%`),
          ilike(emails.fromEmail, `%${searchQuery}%`),
        )}`,
      );
    }

    // 3. Execute Query
    const data = await db
      .select()
      .from(emails)
      .where(and(...conditions))
      .orderBy(desc(emails.date)) // Chronological sort hits the index perfectly
      .limit(limit);

    // 4. Calculate Next Cursor Payload for the UI
    const nextCursor =
      data.length === limit ? data[data.length - 1].date.toISOString() : null;

    return NextResponse.json(
      {
        data,
        nextCursor,
        hasMore: !!nextCursor,
        totalReturned: data.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API EMAILS GET] Failed to execute feed hydration:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
