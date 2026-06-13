import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { createClient } from "@corsair-dev/app";
import { db } from "@/lib/db";
import { userIntegrations } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plugin } = await req.json();
    if (plugin !== "gmail" && plugin !== "googlecalendar") {
      return NextResponse.json({ error: "Invalid plugin. Must be 'gmail' or 'googlecalendar'" }, { status: 400 });
    }

    const apiKey = process.env.CORSAIR_DEV_KEY || process.env.CORSAIR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Corsair key is not configured" }, { status: 500 });
    }

    const corsair = createClient({ apiKey });
    const { instances } = await corsair.instances.list();
    const activeInstance = instances.find(inst => inst.status === "active") || instances[0];
    if (!activeInstance) {
      return NextResponse.json({ error: "No active Corsair instances found" }, { status: 500 });
    }

    const tenantId = session.user.email;
    const t = corsair.instance(activeInstance.id).tenant(tenantId);

    // Clear access_token and refresh_token
    await t.plugins.credentials.clear(plugin, "access_token");
    await t.plugins.credentials.clear(plugin, "refresh_token");

    // Sync with local user_integrations table
    try {
      await db.update(userIntegrations)
        .set({ status: "disconnected" })
        .where(
          and(
            eq(userIntegrations.userEmail, session.user.email),
            eq(userIntegrations.provider, plugin)
          )
        );
    } catch (dbError) {
      console.error("[Corsair Disconnect DB Sync Error]", dbError);
    }

    return NextResponse.json({ success: true, message: `Disconnected ${plugin} successfully.` });
  } catch (error: any) {
    console.error("[Corsair Disconnect Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
