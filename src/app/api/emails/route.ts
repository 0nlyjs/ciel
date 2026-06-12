import { NextResponse } from "next/server";
import { dbInit, query } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET /api/emails - Fetch all cached emails from database
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const { rows } = await query(
      `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
       FROM emails 
       WHERE user_email = $1
       ORDER BY created_at DESC LIMIT 100`,
      [session.user.email]
    );

    return NextResponse.json({ emails: rows });
  } catch (error: any) {
    console.error("[Emails API GET Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

// POST /api/emails - Perform operations (mark read, archive)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const { action, id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Email ID is required" }, { status: 400 });
    }

    if (action === "mark_read") {
      await query("UPDATE emails SET read = TRUE WHERE id = $1 AND user_email = $2", [id, session.user.email]);
      return NextResponse.json({ success: true, message: "Email marked as read" });
    }

    if (action === "archive") {
      await query("DELETE FROM emails WHERE id = $1 AND user_email = $2", [id, session.user.email]);
      return NextResponse.json({ success: true, message: "Email archived" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Emails API POST Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
