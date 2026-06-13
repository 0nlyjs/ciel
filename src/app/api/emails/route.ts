import { CorsairClient } from "@/lib/corsair";
import { NextResponse, after } from "next/server";
import { dbInit, query } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { syncUserEmails } from "@/lib/sync";

// GET /api/emails - Fetch all cached emails from database and sync if requested
export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const url = new URL(req.url);
    const forceSync = url.searchParams.get("sync") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const syncLimit = parseInt(url.searchParams.get("sync_limit") || "150", 10);

    // Check if Gmail integration is connected
    let gmailConnected = false;
    try {
      const integrationRes = await query(
        "SELECT status FROM user_integrations WHERE user_email = $1 AND provider = 'gmail'",
        [session.user.email]
      );
      gmailConnected = integrationRes.rows[0]?.status === 'connected';
    } catch (e) {
      console.error("[Emails API] Failed to check integration status:", e);
    }

    // Sync from Corsair inline and await it if sync=true was requested
    if (forceSync) {
      console.log(`[Emails API] Sync requested for ${session.user.email} (limit: ${syncLimit})...`);
      try {
        await syncUserEmails(session.user.email, syncLimit);
      } catch (err) {
        console.error("[Emails API] Sync failed:", err);
      }
    }

    // Get total count and fetch paginated emails concurrently
    const [countTotalRes, fetchRes] = await Promise.all([
      query(
        "SELECT count(*)::int as count FROM emails WHERE user_email = $1",
        [session.user.email],
      ),
      query(
        `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
         FROM emails 
         WHERE user_email = $1
         ORDER BY date DESC LIMIT $2 OFFSET $3`,
        [session.user.email, limit, offset],
      )
    ]);

    const totalCount = countTotalRes.rows[0]?.count || 0;
    const rows = fetchRes.rows;

    // If we paginated beyond totalCount, hasMore is false
    let hasMore = offset + limit < totalCount;
    if (!hasMore && gmailConnected) {
      // If we have at least filled up to the current offset, there might be more on Gmail
      hasMore = totalCount >= offset + limit;
    }

    return NextResponse.json({ 
      emails: rows, 
      total: totalCount, 
      hasMore: hasMore
    });
  } catch (error: any) {
    console.error("[Emails API GET Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}

// POST /api/emails - Perform operations (mark read, archive)
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const { action, id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Email ID is required" },
        { status: 400 },
      );
    }

    if (action === "mark_read") {
      await query(
        "UPDATE emails SET read = TRUE WHERE id = $1 AND user_email = $2",
        [id, session.user.email],
      );

      // Await write-back to Gmail servers to prevent serverless process termination
      try {
        await CorsairClient.markGmailMessageRead(id, session.user.email);
      } catch (err) {
        console.error("[Emails API] Failed to mark read on Gmail:", err);
      }

      return NextResponse.json({
        success: true,
        message: "Email marked as read locally and synced to Gmail",
      });
    }

    if (action === "archive") {
      await query("DELETE FROM emails WHERE id = $1 AND user_email = $2", [
        id,
        session.user.email,
      ]);
      return NextResponse.json({ success: true, message: "Email archived" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Emails API POST Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}
