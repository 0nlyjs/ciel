import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { corsair } from "@/lib/corsair";
import { db } from "@/lib/db";
import { userIntegrations } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.email;

    let gmailConnected = false;
    let calendarConnected = false;

    try {
      const status = await corsair.manage.connectionStatus.get({ tenantId });
      gmailConnected = status.gmail === "connected";
      calendarConnected = status.googlecalendar === "connected";
    } catch (e) {
      console.warn("Corsair connection status check failed:", e);
    }

    // Sync connection status with local user_integrations table
    try {
      // Sync Gmail
      if (gmailConnected) {
        await db.insert(userIntegrations)
          .values({
            userEmail: session.user.email,
            provider: "gmail",
            connectedEmail: session.user.email,
            status: "connected",
          })
          .onConflictDoUpdate({
            target: [userIntegrations.userEmail, userIntegrations.provider, userIntegrations.connectedEmail],
            set: { status: "connected" },
          });
      } else {
        await db.update(userIntegrations)
          .set({ status: "disconnected" })
          .where(
            and(
              eq(userIntegrations.userEmail, session.user.email),
              eq(userIntegrations.provider, "gmail")
            )
          );
      }

      // Sync Google Calendar
      if (calendarConnected) {
        await db.insert(userIntegrations)
          .values({
            userEmail: session.user.email,
            provider: "googlecalendar",
            connectedEmail: session.user.email,
            status: "connected",
          })
          .onConflictDoUpdate({
            target: [userIntegrations.userEmail, userIntegrations.provider, userIntegrations.connectedEmail],
            set: { status: "connected" },
          });
      } else {
        await db.update(userIntegrations)
          .set({ status: "disconnected" })
          .where(
            and(
              eq(userIntegrations.userEmail, session.user.email),
              eq(userIntegrations.provider, "googlecalendar")
            )
          );
      }
    } catch (dbError) {
      console.error("[Corsair Status DB Sync Error]", dbError);
    }

    return NextResponse.json({ gmailConnected, calendarConnected });
  } catch (error: any) {
    console.error("[Corsair Status Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

