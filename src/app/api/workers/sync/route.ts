import { NextResponse } from "next/server";
import { syncUserEmails } from "@/lib/sync";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

async function workerHandler(req: Request) {
  try {
    const body = await req.json();
    const { userId, userEmail, historyId } = body;

    if (!userId || !userEmail) {
      return new NextResponse("Missing structural context arguments", {
        status: 400,
      });
    }

    console.log(
      `[QUEUE WORKER] QStash invoked execution pipeline for User: ${userId}`,
    );

    // Execute our optimized high-speed chunked synchronization engine
    const result = await syncUserEmails(userId, userEmail, historyId);

    return NextResponse.json(
      { success: true, processed: result.count },
      { status: 200 },
    );
  } catch (error) {
    console.error("[QUEUE WORKER CRASH] Sync execution step failed:", error);
    return new NextResponse("Internal Sync Execution Error", { status: 500 });
  }
}

// Protect background route using Upstash QStash signature verification in production
export const POST =
  process.env.NODE_ENV === "production"
    ? verifySignatureAppRouter(workerHandler)
    : workerHandler;
