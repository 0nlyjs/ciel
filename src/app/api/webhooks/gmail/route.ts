import { NextResponse, after } from "next/server";
import { syncUserEmails } from "@/lib/sync";

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

    let emailAddress = "";
    try {
      const parsedData = JSON.parse(decodedRaw);
      emailAddress = parsedData.emailAddress;
    } catch (parseErr) {
      console.error("[Gmail Webhook] JSON parse error on decoded payload, trying to extract string:", parseErr);
      // Fallback: parse standard email matching from raw string if not JSON
      const match = decodedRaw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) emailAddress = match[0];
    }

    if (!emailAddress) {
      return NextResponse.json({ error: "Email address not found in payload" }, { status: 400 });
    }

    console.log(`[Gmail Webhook] New email notification received for email: ${emailAddress}`);

    // Trigger full background sync asynchronously in the background
    after(() => {
      syncUserEmails(emailAddress).catch((err) => {
        console.error(`[Gmail Webhook] Background sync failed for ${emailAddress}:`, err);
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Gmail Webhook Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
