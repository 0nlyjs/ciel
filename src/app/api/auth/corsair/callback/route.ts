import { NextResponse } from "next/server";
import { processOAuthCallback } from "corsair/oauth";
import { corsair, ensureCorsairSetup } from "@/lib/corsair";
import { db } from "@/lib/db";
import { userIntegrations } from "@/lib/schema";

export async function GET(req: Request) {
  try {
    await ensureCorsairSetup();

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
    }

    const returnTo = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/corsair/callback`;

    const { plugin, tenantId } = await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri: returnTo,
    });

    // Update the local user_integrations table to mark the status as connected
    try {
      await db.insert(userIntegrations)
        .values({
          userEmail: tenantId,
          provider: plugin,
          connectedEmail: tenantId,
          status: "connected",
        })
        .onConflictDoUpdate({
          target: [userIntegrations.userEmail, userIntegrations.provider, userIntegrations.connectedEmail],
          set: { status: "connected" },
        });
      console.log(`[Corsair Callback] Synced user_integrations table for tenant ${tenantId}, provider ${plugin}`);
    } catch (dbError) {
      console.error("[Corsair Callback DB Sync Error]", dbError);
    }

    const redirectUrl = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard?connected=${plugin}`;
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("[Corsair Callback Error]", error);
    return NextResponse.redirect(`${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard?error=oauth_failed`);
  }
}
