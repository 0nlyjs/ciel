import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@corsair-dev/app";
import { dbInit, query } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.CORSAIR_DEV_KEY || process.env.CORSAIR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ gmailConnected: false, calendarConnected: false, offline: true });
    }

    const corsair = createClient({ apiKey });
    const { instances } = await corsair.instances.list();
    const activeInstance = instances.find(inst => inst.status === "active") || instances[0];
    
    if (!activeInstance) {
      return NextResponse.json({ gmailConnected: false, calendarConnected: false, offline: true });
    }

    const tenantId = session.user.email;
    const inst = corsair.instance(activeInstance.id);

    let gmailConnected = false;
    let calendarConnected = false;

    try {
      const { fields: gmailFields } = await inst.plugins.credentials.list("gmail", tenantId);
      gmailConnected = gmailFields.some(f => f.field === "access_token" && f.set);
    } catch (e) {
      console.warn("Gmail plugin credentials check failed:", e);
    }

    try {
      const { fields: calFields } = await inst.plugins.credentials.list("googlecalendar", tenantId);
      calendarConnected = calFields.some(f => f.field === "access_token" && f.set);
    } catch (e) {
      console.warn("Google Calendar plugin credentials check failed:", e);
    }

    // Sync connection status with local user_integrations table
    try {
      await dbInit();
      
      // Sync Gmail
      if (gmailConnected) {
        await query(
          `INSERT INTO user_integrations (user_email, provider, connected_email, status)
           VALUES ($1, 'gmail', $1, 'connected')
           ON CONFLICT (user_email, provider, connected_email) DO UPDATE SET status = 'connected'`,
          [session.user.email]
        );
      } else {
        await query(
          `UPDATE user_integrations SET status = 'disconnected' 
           WHERE user_email = $1 AND provider = 'gmail'`,
          [session.user.email]
        );
      }

      // Sync Google Calendar
      if (calendarConnected) {
        await query(
          `INSERT INTO user_integrations (user_email, provider, connected_email, status)
           VALUES ($1, 'googlecalendar', $1, 'connected')
           ON CONFLICT (user_email, provider, connected_email) DO UPDATE SET status = 'connected'`,
          [session.user.email]
        );
      } else {
        await query(
          `UPDATE user_integrations SET status = 'disconnected' 
           WHERE user_email = $1 AND provider = 'googlecalendar'`,
          [session.user.email]
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
