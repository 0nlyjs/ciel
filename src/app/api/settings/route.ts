import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/settings - Fetch user settings. Create default row if it doesn't exist.
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;
    const rows = await db.select({
      user_email: userSettings.userEmail,
      theme: userSettings.theme,
      sync_interval_minutes: userSettings.syncIntervalMinutes,
      ai_auto_priority: userSettings.aiAutoPriority,
      created_at: userSettings.createdAt,
    })
    .from(userSettings)
    .where(eq(userSettings.userEmail, email));

    if (rows.length === 0) {
      // Create defaults
      const defaultSettings = await db.insert(userSettings)
        .values({
          userEmail: email,
          theme: 'dark',
          syncIntervalMinutes: 60,
          aiAutoPriority: true,
        })
        .returning({
          user_email: userSettings.userEmail,
          theme: userSettings.theme,
          sync_interval_minutes: userSettings.syncIntervalMinutes,
          ai_auto_priority: userSettings.aiAutoPriority,
          created_at: userSettings.createdAt,
        });
      return NextResponse.json(defaultSettings[0]);
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

    const email = session.user.email;
    const { theme, sync_interval_minutes, ai_auto_priority } = await req.json();

    // Validate parameters
    const updated = await db.insert(userSettings)
      .values({
        userEmail: email,
        theme: theme || 'dark',
        syncIntervalMinutes: sync_interval_minutes !== undefined ? parseInt(sync_interval_minutes, 10) : 60,
        aiAutoPriority: ai_auto_priority !== undefined ? !!ai_auto_priority : true
      })
      .onConflictDoUpdate({
        target: [userSettings.userEmail],
        set: {
          theme: theme || 'dark',
          syncIntervalMinutes: sync_interval_minutes !== undefined ? parseInt(sync_interval_minutes, 10) : 60,
          aiAutoPriority: ai_auto_priority !== undefined ? !!ai_auto_priority : true
        }
      })
      .returning({
        user_email: userSettings.userEmail,
        theme: userSettings.theme,
        sync_interval_minutes: userSettings.syncIntervalMinutes,
        ai_auto_priority: userSettings.aiAutoPriority,
        created_at: userSettings.createdAt,
      });

    return NextResponse.json(updated[0]);
  } catch (error: any) {
    console.error("[Settings POST Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
