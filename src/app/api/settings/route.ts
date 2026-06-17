import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/settings - Fetch user settings. Create default row if it doesn't exist.
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const rows = await db
      .select({
        user_id: userSettings.userId,
        sync_interval_minutes: userSettings.syncIntervalMinutes,
        ai_auto_priority: userSettings.aiAutoPriority,
        ai_tone: userSettings.aiTone,
        ai_directive: userSettings.aiDirective,
        tts_voice: userSettings.ttsVoice,
        tts_speed: userSettings.ttsSpeed,
        created_at: userSettings.createdAt,
      })
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    if (rows.length === 0) {
      // Create defaults
      const defaultSettings = await db
        .insert(userSettings)
        .values({
          userId,
          syncIntervalMinutes: 15,
          aiAutoPriority: true,
          aiTone: "professional",
          aiDirective: "",
          ttsVoice: "Google UK English Female",
          ttsSpeed: "1.0",
        })
        .returning({
          user_id: userSettings.userId,
          sync_interval_minutes: userSettings.syncIntervalMinutes,
          ai_auto_priority: userSettings.aiAutoPriority,
          ai_tone: userSettings.aiTone,
          ai_directive: userSettings.aiDirective,
          tts_voice: userSettings.ttsVoice,
          tts_speed: userSettings.ttsSpeed,
          created_at: userSettings.createdAt,
        });
      return NextResponse.json(defaultSettings[0]);
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    console.error("[Settings GET Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}

// POST /api/settings - Update user settings
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { sync_interval_minutes, ai_auto_priority, ai_tone, ai_directive, tts_voice, tts_speed } = await req.json();

    // Validate parameters
    const updated = await db
      .insert(userSettings)
      .values({
        userId,
        syncIntervalMinutes:
          sync_interval_minutes !== undefined
            ? parseInt(sync_interval_minutes, 10)
            : 15,
        aiAutoPriority:
          ai_auto_priority !== undefined ? !!ai_auto_priority : true,
        aiTone: ai_tone !== undefined ? ai_tone : "professional",
        aiDirective: ai_directive !== undefined ? ai_directive : "",
        ttsVoice: tts_voice !== undefined ? tts_voice : "Google UK English Female",
        ttsSpeed: tts_speed !== undefined ? String(tts_speed) : "1.0",
      })
      .onConflictDoUpdate({
        target: [userSettings.userId],
        set: {
          syncIntervalMinutes:
            sync_interval_minutes !== undefined
              ? parseInt(sync_interval_minutes, 10)
              : 15,
          aiAutoPriority:
            ai_auto_priority !== undefined ? !!ai_auto_priority : true,
          aiTone: ai_tone !== undefined ? ai_tone : "professional",
          aiDirective: ai_directive !== undefined ? ai_directive : "",
          ttsVoice: tts_voice !== undefined ? tts_voice : "Google UK English Female",
          ttsSpeed: tts_speed !== undefined ? String(tts_speed) : "1.0",
        },
      })
      .returning({
        user_id: userSettings.userId,
        sync_interval_minutes: userSettings.syncIntervalMinutes,
        ai_auto_priority: userSettings.aiAutoPriority,
        ai_tone: userSettings.aiTone,
        ai_directive: userSettings.aiDirective,
        tts_voice: userSettings.ttsVoice,
        tts_speed: userSettings.ttsSpeed,
        created_at: userSettings.createdAt,
      });

    return NextResponse.json(updated[0]);
  } catch (error: any) {
    console.error("[Settings POST Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}
