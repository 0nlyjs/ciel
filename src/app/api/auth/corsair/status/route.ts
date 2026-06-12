import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@corsair-dev/app";

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

    return NextResponse.json({ gmailConnected, calendarConnected });
  } catch (error: any) {
    console.error("[Corsair Status Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
