import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { userIntegrations } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET /api/integrations - Fetch user integration connections
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;
    const rows = await db.select({
      id: userIntegrations.id,
      provider: userIntegrations.provider,
      connected_email: userIntegrations.connectedEmail,
      status: userIntegrations.status,
      created_at: userIntegrations.createdAt,
    })
    .from(userIntegrations)
    .where(eq(userIntegrations.userEmail, email));

    return NextResponse.json({ integrations: rows });
  } catch (error: any) {
    console.error("[Integrations GET Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
