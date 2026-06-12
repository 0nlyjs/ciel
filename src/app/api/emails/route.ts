import { NextResponse } from "next/server";
import { dbInit, query } from "@/lib/db";

// GET /api/emails - Fetch all cached emails
export async function GET() {
  try {
    await dbInit();

    const { rows } = await query(
      `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
       FROM emails 
       ORDER BY created_at DESC LIMIT 100`
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
    await dbInit();

    const { action, id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Email ID is required" }, { status: 400 });
    }

    if (action === "mark_read") {
      await query("UPDATE emails SET read = TRUE WHERE id = $1", [id]);
      return NextResponse.json({ success: true, message: "Email marked as read" });
    }

    if (action === "archive") {
      await query("DELETE FROM emails WHERE id = $1", [id]);
      return NextResponse.json({ success: true, message: "Email archived" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Emails API POST Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
