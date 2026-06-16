import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { syncUserEmails } from "@/lib/sync";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user)
      return new NextResponse("Unauthorized", { status: 401 });

    const userId = session.user.id;
    const userEmail = session.user.email;

    console.log(`[MANUAL SYNC] Refresh triggered by user: ${userEmail}`);

    // Execute the high-speed batch engine
    const result = await syncUserEmails(userId, userEmail);

    return NextResponse.json(
      {
        success: true,
        newEmailsCount: result.count,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API MANUAL SYNC] Failed to execute refresh:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
