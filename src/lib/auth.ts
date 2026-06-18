import { betterAuth } from "better-auth";
import { db } from "./db";
import * as schema from "./schema";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { headers } from "next/headers";
import { createAuthMiddleware } from "better-auth/api";
import { eq, and, lt } from "drizzle-orm";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  user: {
    modelName: "users",
    fields: {
      emailVerified: "verified",
    },
  },
  accountLinking: {
    enabled: true,
    trustedProviders: ["google"],
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // 1. Clean up any unverified users older than 24 hours on sign-up/sign-in attempts
      if (ctx.path === "/sign-up/email" || ctx.path === "/sign-in/email") {
        try {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          await db
            .delete(schema.users)
            .where(
              and(
                eq(schema.users.verified, false),
                lt(schema.users.createdAt, oneDayAgo),
              ),
            );
        } catch (error) {
          console.error(
            "[Auth Hook] Error during old unverified users cleanup:",
            error,
          );
        }
      }

      // 2. If signing up with an email that is already in the DB but unverified, delete it first
      if (ctx.path === "/sign-up/email" && ctx.body?.email) {
        try {
          const email = ctx.body.email.trim().toLowerCase();
          const existingUsers = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, email));

          if (existingUsers.length > 0 && !existingUsers[0].verified) {
            console.log(
              `[Auth Hook] Purging unverified user ${email} before fresh sign-up.`,
            );
            await db.delete(schema.users).where(eq(schema.users.email, email));
          }
        } catch (error) {
          console.error(
            "[Auth Hook] Error purging unverified user on signup:",
            error,
          );
        }
      }
    }),
  },
  emailVerification: {
    sendOnSignUp: false,
    sendVerificationEmail: async ({ user, url }) => {
      const apiKey = process.env.CORSAIR_API_KEY || process.env.CORSAIR_DEV_KEY;
      const subject = "Ciel Security Verification Link";

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
              A registration request was initialized. Click the link below to verify your email and complete authentication.
            </p>
    
            <!-- Link Block -->
            <div style="margin-bottom: 24px;">
              <a href="${url}" style="display: inline-block; background-color: #FF007F; color: #FFFFFF; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; border: 1px solid rgba(0, 240, 255, 0.25);">
                Verify Email
              </a>
            </div>
    
            <p style="color: rgba(255, 255, 255, 0.35); font-size: 11px; margin: 0 0 20px 0;">
              This verification link is temporary and will expire in 15 minutes.
            </p>
    
            <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 20px 0;" />
    
            <!-- Footer -->
            <div style="font-family: monospace; font-size: 9px; color: rgba(255, 255, 255, 0.25);">
              SECURE_SESSION // OAUTH_2.0 // AES_256_GCM
            </div>
    
          </div>
        </div>
      `;

      console.log(`\n==================================================`);
      console.log(`[Better Auth API] Verification Link for ${user.email}:`);
      console.log(`${url}`);
      console.log(`==================================================\n`);

      if (apiKey) {
        try {
          await fetch("https://api.corsair.dev/v1/gmail/send", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ to: user.email, subject, body }),
          });
          console.log(
            `[Better Auth API] Verification email sent successfully to ${user.email}`,
          );
        } catch (error) {
          console.error(
            "[Better Auth API] Failed to send email via Corsair:",
            error,
          );
        }
      } else {
        console.log(
          "[Better Auth API] Corsair API key not configured. Fallback: Please check the link printed above.",
        );
      }
    },
  },
});

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return null;
  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
  };
}
