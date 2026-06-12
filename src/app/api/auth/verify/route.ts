import { NextResponse } from "next/server";
import { dbInit, query } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await dbInit();
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    // 1. Fetch verification code details
    const res = await query("SELECT code, expires_at FROM verification_codes WHERE email = $1", [email]);
    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "No verification code request found." },
        { status: 400 }
      );
    }

    const { code: dbCode, expires_at: dbExpiresAt } = res.rows[0];

    // 2. Validate code
    if (dbCode !== code.trim()) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    // 3. Verify expiration
    if (new Date(dbExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired." },
        { status: 400 }
      );
    }

    // 4. Update user verification status to true
    await query("UPDATE users SET verified = TRUE WHERE email = $1", [email]);

    // 5. Clean up code
    await query("DELETE FROM verification_codes WHERE email = $1", [email]);

    return NextResponse.json({ success: true, message: "Email verified successfully." });
  } catch (error) {
    console.error("[Verify API] Code validation error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
