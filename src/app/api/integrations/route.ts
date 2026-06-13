import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbInit, query } from "@/lib/db";

// GET /api/integrations - Fetch user integration connections
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const email = session.user.email;
    const { rows } = await query(
      "SELECT id, provider, connected_email, status, created_at FROM user_integrations WHERE user_email = $1",
      [email]
    );

    return NextResponse.json({ integrations: rows });
  } catch (error: any) {
    console.error("[Integrations GET Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
