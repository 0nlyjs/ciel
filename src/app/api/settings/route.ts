import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { dbInit, query } from "@/lib/db";

// GET /api/settings - Fetch user settings. Create default row if it doesn't exist.
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const email = session.user.email;
    const { rows } = await query("SELECT * FROM user_settings WHERE user_email = $1", [email]);

    if (rows.length === 0) {
      // Create defaults
      const defaultSettings = await query(
        `INSERT INTO user_settings (user_email, theme, sync_interval_minutes, ai_auto_priority)
         VALUES ($1, 'dark', 60, TRUE)
         RETURNING *`,
        [email]
      );
      return NextResponse.json(defaultSettings.rows[0]);
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error("[Settings GET Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

// POST /api/settings - Update user settings
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const email = session.user.email;
    const { theme, sync_interval_minutes, ai_auto_priority } = await req.json();

    // Validate parameters
    const updated = await query(
      `INSERT INTO user_settings (user_email, theme, sync_interval_minutes, ai_auto_priority)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_email) DO UPDATE SET
         theme = EXCLUDED.theme,
         sync_interval_minutes = EXCLUDED.sync_interval_minutes,
         ai_auto_priority = EXCLUDED.ai_auto_priority
       RETURNING *`,
      [
        email,
        theme || 'dark',
        sync_interval_minutes !== undefined ? parseInt(sync_interval_minutes, 10) : 60,
        ai_auto_priority !== undefined ? !!ai_auto_priority : true
      ]
    );

    return NextResponse.json(updated.rows[0]);
  } catch (error: any) {
    console.error("[Settings POST Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
