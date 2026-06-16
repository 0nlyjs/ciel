import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { Client } from "@upstash/qstash";

const qstash = new Client({
  token: process.env.QSTASH_TOKEN || "",
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Google Pub/Sub wrappers payload inside a 'message.data' base64 string
    if (!body.message?.data) {
      return new NextResponse("Missing message data", { status: 400 });
    }

    const decodedData = JSON.parse(
      Buffer.from(body.message.data, "base64").toString("utf-8"),
    );

    const { emailAddress, historyId } = decodedData;
    if (!emailAddress) {
      return new NextResponse("Missing email address in payload", {
        status: 400,
      });
    }

    // Instantly look up internal immutable user ID using incoming email address
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailAddress))
      .limit(1);

    if (!user) {
      console.log(
        `[PUB/SUB GMAIL] Webhook received for untracked user: ${emailAddress}`,
      );
      return NextResponse.json({ skipped: true }, { status: 200 });
    }

    // Offload processing execution to Upstash QStash queue to prevent serverless timeouts
    const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/workers/sync`;

    await qstash.publishJSON({
      url: workerUrl,
      body: {
        userId: user.id,
        userEmail: emailAddress,
        historyId: historyId ? String(historyId) : undefined,
      },
    });

    // Acknowledge receipt to Google instantly (Sub-10ms response window)
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[CRITICAL WEBHOOK ERROR] Pub/Sub triage failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
