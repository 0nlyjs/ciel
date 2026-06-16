import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { pool, db } from "@/lib/db";
import { createCorsairDatabase } from "corsair/db";
import { createCorsairOrm } from "corsair/orm";
import { userIntegrations } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plugin } = await req.json();
    if (plugin !== "gmail" && plugin !== "googlecalendar") {
      return NextResponse.json(
        { error: "Invalid plugin. Must be 'gmail' or 'googlecalendar'" },
        { status: 400 },
      );
    }

    const tenantId = session.user.email;
    const userId = session.user.id;
    const orm = createCorsairOrm(createCorsairDatabase(pool));

    // Clear access_token and refresh_token by deleting account records
    const integration = await orm.integrations.findByName(plugin);
    if (integration) {
      await orm.accounts.deleteMany({
        tenant_id: tenantId,
        integration_id: integration.id,
      });
    }

    // Sync with local user_integrations table
    try {
      await db
        .update(userIntegrations)
        .set({ status: "disconnected" })
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, plugin),
          ),
        );
    } catch (dbError) {
      console.error("[Corsair Disconnect DB Sync Error]", dbError);
    }

    return NextResponse.json({
      success: true,
      message: `Disconnected ${plugin} successfully.`,
    });
  } catch (error: any) {
    console.error("[Corsair Disconnect Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}
