import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbInit, query } from "@/lib/db";
import { createClient } from "@corsair-dev/app";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;

    // 1. Delete integrations from Corsair
    const apiKey = process.env.CORSAIR_DEV_KEY || process.env.CORSAIR_API_KEY;
    if (apiKey) {
      try {
        const corsair = createClient({ apiKey });
        const { instances } = await corsair.instances.list();
        const activeInstance = instances.find(inst => inst.status === "active") || instances[0];
        if (activeInstance) {
          await corsair.instance(activeInstance.id).tenant(userEmail).delete();
        }
      } catch (e) {
        console.warn("Failed to delete tenant on Corsair:", e);
      }
    }

    // 2. Delete data from local Neon Database
    await dbInit();
    await query("DELETE FROM emails WHERE user_email = $1", [userEmail]);
    await query("DELETE FROM calendar_events WHERE user_email = $1", [userEmail]);
    await query("DELETE FROM users WHERE email = $1", [userEmail]);

    return NextResponse.json({ success: true, message: "Account deleted successfully." });
  } catch (error: any) {
    console.error("[Profile Delete Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
