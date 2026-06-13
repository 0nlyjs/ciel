import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { createClient } from "@corsair-dev/app";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const plugin = searchParams.get("plugin");

    if (plugin !== "gmail" && plugin !== "googlecalendar") {
      return NextResponse.json({ error: "Invalid plugin. Must be 'gmail' or 'googlecalendar'" }, { status: 400 });
    }

    const apiKey = process.env.CORSAIR_DEV_KEY || process.env.CORSAIR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Corsair key is not configured" }, { status: 500 });
    }

    const corsair = createClient({ apiKey });
    
    // Find the active instance dynamically
    const { instances } = await corsair.instances.list();
    const activeInstance = instances.find(inst => inst.status === "active") || instances[0];
    if (!activeInstance) {
      return NextResponse.json({ error: "No active Corsair instances found" }, { status: 500 });
    }

    const tenantId = session.user.email;
    const returnTo = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/?connected=${plugin}`;

    const t = corsair.instance(activeInstance.id).tenant(tenantId);
    const { authorizeUrl } = await t.plugins.oauth.authorizeUrl(plugin, returnTo);

    return NextResponse.json({ authorizeUrl });
  } catch (error: any) {
    console.error("[Corsair Connect Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
