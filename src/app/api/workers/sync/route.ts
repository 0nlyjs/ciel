import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { syncUserEmails } from "@/lib/sync";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || "",
});

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("upstash-signature");
    const rawBody = await req.text();

    const isDev = process.env.NODE_ENV === "development";
    const hasKeys = !!(process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY);

    // In production, we always verify the signature. In development, we skip only if keys are not set.
    if (!isDev || hasKeys) {
      if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }

      const isValid = await receiver.verify({
        signature,
        body: rawBody,
      }).catch((err) => {
        console.error("[QStash Worker] Signature verification failed with error:", err);
        return false;
      });

      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const { userId, historyId } = payload;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    console.log(`[QStash Worker] Starting sync for user: ${userId}, historyId: ${historyId}`);

    // Trigger the heavy email synchronization pipeline
    const result = await syncUserEmails(userId);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("[QStash Worker Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
