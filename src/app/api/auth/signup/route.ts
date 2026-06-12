import { NextResponse } from "next/server";
import { dbInit, query } from "@/lib/db";
import crypto from "crypto";

const salt = "ciel-workspace-salt-vector-auth";
function hashPassword(password: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

async function sendVerificationEmail(to: string, code: string) {
  const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
  const subject = "Ciel Security Verification Code";
  
  // HTML Template styling matching Ciel workspace colors (void, abyssal, cyan-glow, magenta)
  const body = `
    <div style="font-family: 'Outfit', sans-serif; background-color: #090B10; color: #FFFFFF; padding: 40px 20px; text-align: center;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #111625; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px; box-shadow: 0 0 30px rgba(0, 240, 255, 0.15);">
        
        <!-- Header -->
        <div style="margin-bottom: 24px;">
          <h2 style="color: #00F0FF; font-size: 20px; font-weight: bold; letter-spacing: 2px; margin: 0; text-transform: uppercase;">
            Ciel Workspace
          </h2>
          <p style="color: rgba(255, 255, 255, 0.4); font-size: 10px; font-family: monospace; letter-spacing: 1px; margin: 4px 0 0 0;">
            SECURITY_HANDSHAKE_NODE
          </p>
        </div>

        <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 20px 0;" />

        <!-- Core Message -->
        <p style="color: #B0BAC9; font-size: 13px; line-height: 1.6; margin: 0 0 24px 0;">
          A login or registration request was initialized. Use the 6-digit access code below to complete authentication.
        </p>

        <!-- Code Block -->
        <div style="background-color: #090B10; border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <div style="font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #FF007F; line-height: 1;">
            ${code}
          </div>
        </div>

        <p style="color: rgba(255, 255, 255, 0.35); font-size: 11px; margin: 0 0 20px 0;">
          This security code is temporary and will expire in 15 minutes.
        </p>

        <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 20px 0;" />

        <!-- Footer -->
        <div style="font-family: monospace; font-size: 9px; color: rgba(255, 255, 255, 0.25);">
          SECURE_SESSION // OAUTH_2.0 // AES_256_GCM
        </div>

      </div>
    </div>
  `;

  console.log(`[Signup API] HTML Verification email generated for ${to} with code: ${code}`);

  if (apiKey) {
    try {
      await fetch("https://api.corsair.dev/v1/gmail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, subject, body }),
      });
    } catch (error) {
      console.error("[Signup API] Failed to send email via Corsair:", error);
    }
  } else {
    console.log("[Signup API] Corsair API key not configured. Fallback: Check local console logs for the verification code.");
  }
}

export async function POST(req: Request) {
  try {
    await dbInit();
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    // 1. Verify if user already exists
    const checkUser = await query("SELECT id, verified FROM users WHERE email = $1", [email]);
    if (checkUser.rows.length > 0) {
      return NextResponse.json(
        { error: "This email is already registered." },
        { status: 400 }
      );
    }

    // 2. Hash password and insert user record with verified = false
    const hashedPassword = hashPassword(password);
    await query(
      "INSERT INTO users (name, email, password, verified) VALUES ($1, $2, $3, FALSE)",
      [name, email, hashedPassword]
    );

    // 3. Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await query(
      `INSERT INTO verification_codes (email, code, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [email, code, expiresAt]
    );

    // 4. Send email
    await sendVerificationEmail(email, code);

    return NextResponse.json({
      success: true,
      verified: false,
      email,
      message: "Verification code sent to your email address."
    });
  } catch (error) {
    console.error("[Signup API] Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
