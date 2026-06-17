import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { syncUserEmails, syncCalendarEvents } from "@/lib/sync";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return new NextResponse("Unauthorized", { status: 401 });

    const userId = session.user.id;
    const userEmail = session.user.email;

    console.log(`[MANUAL SYNC] Refresh triggered by user: ${userEmail}`);

    // Execute the high-speed batch engines
    const emailResult = await syncUserEmails(userId, userEmail);
    let calendarResult = { success: true, count: 0 };
    try {
      calendarResult = await syncCalendarEvents(userId, userEmail);
    } catch (calErr) {
      console.error("[API MANUAL SYNC] Calendar sync failed:", calErr);
    }

    return NextResponse.json(
      {
        success: true,
        newEmailsCount: emailResult.count,
        newEventsCount: calendarResult.count,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API MANUAL SYNC] Failed to execute refresh:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
