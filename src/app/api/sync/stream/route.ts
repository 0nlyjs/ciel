import { getServerSession } from "@/lib/auth";
import { CorsairClient } from "@/lib/corsair";
import { syncUserEmails } from "@/lib/sync";

import { db } from "@/lib/db";
import { userIntegrations } from "@/lib/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Active client stream controllers mapped by user email
export const activeClients = new Map<
  string,
  ReadableStreamDefaultController[]
>();

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id || !session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }
    const userId = session.user.id;
    const email = session.user.email;

    const responseHeaders = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Bypasses buffering on Nginx/Vercel
    });

    const stream = new ReadableStream({
      start(controller) {
        // Register client controller
        if (!activeClients.has(email)) {
          activeClients.set(email, []);
        }
        activeClients.get(email)!.push(controller);

        console.log(
          `[SSE Stream] Client connected: ${email}. Active streams: ${activeClients.get(email)!.length}`,
        );

        // Send initial connection handshake event
        controller.enqueue(new TextEncoder().encode("data: connected\n\n"));

        // Setup keep-alive heartbeat interval to prevent gateway timeouts (e.g. Vercel 15s limit)
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(new TextEncoder().encode(":\n\n")); // SSE comment as comment heartbeat
          } catch {
            clearInterval(heartbeatInterval);
          }
        }, 15000);

        // --- LOCAL DEV FALLBACK POLLER ---
        // Checks for new email skeletons to support local testing out-of-the-box
        // Uses recursive setTimeout to prevent request overlap pile-up (concurrency control)
        let lastCheckedId = "";
        let isGmailConnected = false;
        let timerId: NodeJS.Timeout | null = null;
        let active = true;

        const checkConnectionAndStartPoll = async () => {
          if (!active) return;
          try {
            const [integration] = await db
              .select()
              .from(userIntegrations)
              .where(
                and(
                  eq(userIntegrations.userId, userId),
                  eq(userIntegrations.provider, "gmail"),
                  eq(userIntegrations.status, "connected"),
                ),
              )
              .limit(1);

            isGmailConnected = !!integration;

            if (isGmailConnected && active) {
              pollNext();
            } else if (active) {
              // Re-check connection status in 10 seconds
              timerId = setTimeout(checkConnectionAndStartPoll, 10000);
            }
          } catch (err) {
            console.error("[SSE Stream] Failed to check connection status:", err);
            if (active) {
              timerId = setTimeout(checkConnectionAndStartPoll, 10000);
            }
          }
        };

        const pollNext = async () => {
          if (!active) return;
          try {
            const skeletons = await CorsairClient.listGmailMessagesDirectly(
              email,
              1,
            );
            if (skeletons && skeletons.length > 0) {
              const latestId = skeletons[0].id;
              if (lastCheckedId && latestId !== lastCheckedId) {
                console.log(
                  `[SSE Stream] Local poller detected new email ${latestId} for ${email}. Triggering background sync...`,
                );
                syncUserEmails(userId, email).catch((err) => {
                  console.error(
                    "[SSE Stream] Background poller sync failed:",
                    err,
                  );
                });
              }
              lastCheckedId = latestId;
            }
          } catch (e) {
            console.error("[SSE Stream] Local poller fetch error:", e);
          } finally {
            if (active) {
              // Wait 25 seconds before the next poll attempt
              timerId = setTimeout(pollNext, 25000);
            }
          }
        };

        // Start checking connection status
        checkConnectionAndStartPoll();

        // Cleanup resources on abort
        req.signal.addEventListener("abort", () => {
          console.log(`[SSE Stream] Connection aborted for ${email}`);
          active = false;
          clearInterval(heartbeatInterval);
          if (timerId) {
            clearTimeout(timerId);
          }

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
          } catch {}
        });
      },
    });

    return new Response(stream, { headers: responseHeaders });
  } catch (error: any) {
    console.error("[SSE Stream Endpoint Error]", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
