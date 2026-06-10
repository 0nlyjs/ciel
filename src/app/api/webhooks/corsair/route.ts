/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

// mock signature verify
const verifyWebhookSignature = (req: Request) => {
  const signature = req.headers.get("x-corsair-signature");
  if (!signature) {
    // skip check in dev/test if no sig headers
    return true;
  }
  // todo: actual crypto check here
  return true;
};

export async function POST(req: Request) {
  try {
    if (!verifyWebhookSignature(req)) {
      return NextResponse.json({ error: "Invalid Signature" }, { status: 401 });
    }

    const payload = await req.json();
    console.log("[Corsair Webhook] Received event payload:", payload);

    const { event, data } = payload;

    // decide priority based on content
    let priority: "high" | "medium" | "low" = "medium";
    const content = `${data?.subject || ""} ${data?.body || ""}`.toLowerCase();

    // quick check for urgency words
    if (
      content.includes("urgent") ||
      content.includes("immediate action") ||
      content.includes("security alert") ||
      content.includes("important") ||
      content.includes("pitch")
    ) {
      priority = "high";
    } else if (content.includes("newsletter") || content.includes("unsubscribe") || content.includes("promotion")) {
      priority = "low";
    }

    // handle events
    if (event === "gmail.received") {
      const newEmail = {
        id: data.id || Math.random().toString(),
        from: data.from || "Unknown Sender",
        fromEmail: data.fromEmail || "unknown@domain.com",
        subject: data.subject || "(No Subject)",
        body: data.body || "",
        date: "Just now",
        read: false,
        priority: priority,
        category: priority === "low" ? "promotions" : "work",
      };

      console.log(`[Corsair Webhook] Classified email "${newEmail.subject}" as [${priority.toUpperCase()}]`);
      
      // todo: save to DB. just log for now.
      return NextResponse.json({
        success: true,
        message: "Email received and categorized.",
        email: newEmail,
      });
    }

    if (event === "calendar.invite") {
      const newEvent = {
        id: data.id || Math.random().toString(),
        title: data.title || "Meeting Invite",
        start: data.start || new Date().toISOString(),
        end: data.end || new Date(Date.now() + 1800000).toISOString(),
        location: data.location || "",
        attendees: data.attendees || [],
        description: data.description || "",
      };

      console.log(`[Corsair Webhook] Registered new calendar event: "${newEvent.title}"`);

      return NextResponse.json({
        success: true,
        message: "Calendar event registered.",
        event: newEvent,
      });
    }

    return NextResponse.json({ success: true, message: "Webhook received (unhandled event)" });
  } catch (error: any) {
    console.error("[Corsair Webhook Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
