import { NextResponse } from "next/server";
import { processOAuthCallback } from "corsair/oauth";
import { corsair, ensureCorsairSetup } from "@/lib/corsair";
import { db } from "@/lib/db";
import { userIntegrations, users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    await ensureCorsairSetup();

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const oauthError = searchParams.get("error");
    const oauthErrorDescription = searchParams.get("error_description");

    if (oauthError) {
      console.error(`[Corsair Callback] OAuth error from provider: ${oauthError} - ${oauthErrorDescription}`);
      return NextResponse.redirect(
        `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard?error=${encodeURIComponent(oauthError)}`,
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing code or state" },
        { status: 400 },
      );
    }

    const returnTo = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/corsair/callback`;

    const { plugin, tenantId } = await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri: returnTo,
    });

    // Look up userId from tenantId (email)
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, tenantId))
      .limit(1);

    if (!user) {
      return NextResponse.redirect(
        `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard?error=user_not_found`,
      );
    }

    // Update the local user_integrations table to mark the status as connected
    try {
      await db
        .insert(userIntegrations)
        .values({
          userId: user.id,
          provider: plugin,
          connectedEmail: tenantId,
          status: "connected",
        })
        .onConflictDoUpdate({
          target: [
            userIntegrations.userId,
            userIntegrations.provider,
            userIntegrations.connectedEmail,
          ],
          set: { status: "connected" },
        });
      console.log(
        `[Corsair Callback] Synced user_integrations table for user ${user.id}, provider ${plugin}`,
      );
    } catch (dbError) {
      console.error("[Corsair Callback DB Sync Error]", dbError);
    }

    const redirectUrl = `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard?connected=${plugin}`;
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("[Corsair Callback Error]", error);
    return NextResponse.redirect(
      `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/dashboard?error=oauth_failed`,
    );
  }
}
