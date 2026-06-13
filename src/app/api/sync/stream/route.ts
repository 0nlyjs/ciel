import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { CorsairClient } from "@/lib/corsair";

export const dynamic = "force-dynamic";

// Active client stream controllers mapped by user email
export const activeClients = new Map<string, ReadableStreamDefaultController[]>();

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }
    const email = session.user.email;

    const responseHeaders = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Bypasses buffering on Nginx/Vercel
    });

    const stream = new ReadableStream({
      start(controller) {
        // Register client controller
        if (!activeClients.has(email)) {
          activeClients.set(email, []);
        }
        activeClients.get(email)!.push(controller);

        console.log(`[SSE Stream] Client connected: ${email}. Active streams: ${activeClients.get(email)!.length}`);

        // Send initial connection handshake event
        controller.enqueue(new TextEncoder().encode("data: connected\n\n"));

        // Setup keep-alive heartbeat interval to prevent gateway timeouts (e.g. Vercel 15s limit)
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(":\n\n")); // SSE comment as comment heartbeat
          } catch (e) {
            clearInterval(heartbeatInterval);
          }
        }, 15000);

        // --- LOCAL DEV FALLBACK POLLER ---
        // Checks for new email skeletons every 20 seconds to support local testing out-of-the-box
        let lastCheckedId = "";
        const localPollInterval = setInterval(async () => {
          try {
            const skeletons = await CorsairClient.listGmailMessagesDirectly(email, 1);
            if (skeletons && skeletons.length > 0) {
              const latestId = skeletons[0].id;
              if (lastCheckedId && latestId !== lastCheckedId) {
                console.log(`[SSE Stream] Local poller detected new email ${latestId} for ${email}. Notifying client...`);
                controller.enqueue(new TextEncoder().encode("data: new_email\n\n"));
              }
              lastCheckedId = latestId;
            }
          } catch (e) {
            console.error("[SSE Stream] Local poller fetch error:", e);
          }
        }, 20000);

        // Cleanup resources on abort
        req.signal.addEventListener("abort", () => {
          console.log(`[SSE Stream] Connection aborted for ${email}`);
          clearInterval(heartbeatInterval);
          clearInterval(localPollInterval);
          
          const list = activeClients.get(email);
          if (list) {
            const filtered = list.filter((c) => c !== controller);
            if (filtered.length > 0) {
              activeClients.set(email, filtered);
            } else {
              activeClients.delete(email);
            }
          }
          
          try {
            controller.close();
          } catch (e) {}
        });
      },
    });

    return new Response(stream, { headers: responseHeaders });
  } catch (error: any) {
    console.error("[SSE Stream Endpoint Error]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
