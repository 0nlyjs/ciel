import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { generateOAuthUrl } from "corsair/oauth";
import { corsair } from "@/lib/corsair";

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

    const tenantId = session.user.email;
    const returnTo = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/?connected=${plugin}`;

    const { url } = await generateOAuthUrl(corsair, plugin, {
      tenantId,
      redirectUri: returnTo,
    });

    return NextResponse.json({ authorizeUrl: url });
  } catch (error: any) {
    console.error("[Corsair Connect Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

