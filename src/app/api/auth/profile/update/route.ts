import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { dbInit, query } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await dbInit();
    await query("UPDATE users SET name = $1 WHERE email = $2", [name.trim(), session.user.email]);

    return NextResponse.json({ success: true, name: name.trim() });
  } catch (error: any) {
    console.error("[Profile Update Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
