import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { dbInit, query } from "@/lib/db";
import crypto from "crypto";

const salt = "ciel-workspace-salt-vector-auth";
export function hashPassword(password: string): string {
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

  console.log(`[NextAuth API] HTML Verification email generated for ${to} with code: ${code}`);

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
      console.error("[NextAuth API] Failed to send email via Corsair:", error);
    }
  } else {
    console.log("[NextAuth API] Corsair API key not configured. Fallback: Check local console logs for the verification code.");
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await dbInit();
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Developer/Tester Fallback Account
        if (credentials.email === "guest@ciel.app" && credentials.password === "password") {
          return {
            id: "guest-id",
            name: "Guest Node",
            email: "guest@ciel.app",
          };
        }

        try {
          // Query user database
          const res = await query("SELECT * FROM users WHERE email = $1", [credentials.email]);
          if (res.rows.length === 0) {
            return null;
          }

          const user = res.rows[0];
          const hashedPassword = hashPassword(credentials.password);

          if (user.password === hashedPassword) {
            // Check if user email is verified
            if (!user.verified) {
              // Generate and dispatch code on demand
              const code = Math.floor(100000 + Math.random() * 900000).toString();
              const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

              await query(
                `INSERT INTO verification_codes (email, code, expires_at)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
                [credentials.email, code, expiresAt]
              );

              await sendVerificationEmail(credentials.email, code);

              // Throw custom error to signal frontend to show code entry modal
              throw new Error("UNVERIFIED");
            }

            return {
              id: user.id.toString(),
              name: user.name,
              email: user.email,
            };
          }
        } catch (error) {
          console.error("[Auth] Database credentials authorization error:", error);
          if (error instanceof Error && error.message === "UNVERIFIED") {
            throw error; // Propagate custom NextAuth validation error
          }
        }

        return null;
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email;
        const name = user.name;
        if (email) {
          try {
            const checkUser = await query("SELECT id FROM users WHERE email = $1", [email]);
            if (checkUser.rows.length === 0) {
              await query(
                "INSERT INTO users (name, email, password, verified) VALUES ($1, $2, NULL, TRUE)",
                [name || "Google User", email]
              );
              console.log(`[NextAuth Callback] Successfully registered new Google user: ${email}`);
            } else {
              await query(
                "UPDATE users SET verified = TRUE WHERE email = $1",
                [email]
              );
            }
          } catch (error) {
            console.error("[NextAuth Callback] Error registering Google user:", error);
          }
        }
      }
      return true;
    },
    async session({ session, token }) {
      return session;
    },
  },
});

export { handler as GET, handler as POST };
