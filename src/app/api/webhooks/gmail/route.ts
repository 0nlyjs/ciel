import { NextResponse, after } from "next/server";
import { Client } from "@upstash/qstash";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[Gmail Webhook] Received Pub/Sub payload:", JSON.stringify(body));

    if (!body?.message?.data) {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    // Decode the base64 Pub/Sub data
    const decodedRaw = Buffer.from(body.message.data, "base64").toString("utf8");
    console.log("[Gmail Webhook] Decoded raw data:", decodedRaw);

    let userId = "";
    let historyId: number | null = null;
    try {
      const parsedData = JSON.parse(decodedRaw);
      userId = parsedData.emailAddress;
      historyId = parsedData.historyId;
    } catch (parseErr) {
      console.error("[Gmail Webhook] JSON parse error on decoded payload, trying to extract string:", parseErr);
      // Fallback: parse standard email matching from raw string if not JSON
      const match = decodedRaw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) userId = match[0];
    }

    if (!userId) {
      return NextResponse.json({ error: "Email address not found in payload" }, { status: 400 });
    }

    console.log(`[Gmail Webhook] New email notification received for user: ${userId}, historyId: ${historyId}`);

    // Resolve the worker absolute URL
    const url = new URL(req.url);
    const origin = process.env.BETTER_AUTH_URL || url.origin;
    const workerUrl = `${origin}/api/workers/sync`;

    const hasQStash = !!process.env.QSTASH_TOKEN;

    if (hasQStash) {
      const qstashClient = new Client({
        token: process.env.QSTASH_TOKEN!,
      });

      await qstashClient.publishJSON({
        url: workerUrl,
        body: {
          userId,
          historyId,
        },
      });
      console.log(`[Gmail Webhook] Successfully queued sync job in QStash for user ${userId}`);
    } else {
      console.warn("[Gmail Webhook] QSTASH_TOKEN is not configured. Falling back to local direct worker invocation.");
      // Invoke the worker route asynchronously using fetch to avoid blocking the webhook response
      after(async () => {
        try {
          await fetch(workerUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId, historyId }),
          });
          console.log(`[Gmail Webhook Fallback] Direct worker sync invocation triggered successfully for user ${userId}`);
        } catch (err) {
          console.error("[Gmail Webhook Fallback] Direct worker sync invocation failed:", err);
        }
      });
    }

    // Immediately return 200 OK to prevent Google from timing out and retrying
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Gmail Webhook Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
