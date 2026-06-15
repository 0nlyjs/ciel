import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { pool, db } from "@/lib/db";
import { emails, calendarEvents, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { createCorsairDatabase } from "corsair/db";
import { createCorsairOrm } from "corsair/orm";

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;

    // 1. Delete integrations from Corsair
    try {
      const orm = createCorsairOrm(createCorsairDatabase(pool));
      await orm.accounts.deleteMany({ tenant_id: userEmail });
    } catch (e) {
      console.warn("Failed to delete tenant on Corsair:", e);
    }

    // 2. Delete data from local Neon Database using Drizzle ORM
    await db.delete(emails).where(eq(emails.userEmail, userEmail));
    await db.delete(calendarEvents).where(eq(calendarEvents.userEmail, userEmail));
    await db.delete(users).where(eq(users.email, userEmail));

    return NextResponse.json({ success: true, message: "Account deleted successfully." });
  } catch (error: any) {
    console.error("[Profile Delete Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

