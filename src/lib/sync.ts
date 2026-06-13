import { CorsairClient } from "@/lib/corsair";
import { db } from "@/lib/db";
import { emails } from "@/lib/schema";
import { getEmbeddingsBatch } from "@/lib/embeddings";
import { activeClients } from "@/app/api/sync/stream/route";
import { eq, and, desc, inArray, notInArray, sql, isNull } from "drizzle-orm";

function runKeywordFallback(subject: string, body: string) {
  const content = `${subject} ${body}`.toLowerCase();
  let priority: "high" | "medium" | "low" = "medium";
  let category: "work" | "personal" | "updates" | "promotions" = "work";

  if (
    content.includes("urgent") ||
    content.includes("immediate action") ||
    content.includes("security alert") ||
    content.includes("important") ||
    content.includes("pitch")
  ) {
    priority = "high";
  } else if (
    content.includes("newsletter") ||
    content.includes("unsubscribe") ||
    content.includes("promotion")
  ) {
    priority = "low";
    category = "promotions";
  }

  if (
    content.includes("meeting") ||
    content.includes("calendar") ||
    content.includes("schedule")
  ) {
    category = "updates";
  }

  return { priority, category };
}

async function generateAndSaveEmbeddings(parsedEmails: any[], userEmail: string) {
  const textsToEmbed = parsedEmails.map(e => e.textToEmbed);
  if (textsToEmbed.length === 0) return;

  try {
    const embeddings = await getEmbeddingsBatch(textsToEmbed);
    if (embeddings && embeddings.length > 0) {
      await Promise.all(
        parsedEmails.map(async (email, i) => {
          const embedding = embeddings[i];
          if (embedding) {
            await db.update(emails)
              .set({ embedding })
              .where(
                and(
                  eq(emails.id, email.id),
                  eq(emails.userEmail, userEmail)
                )
              );
          }
        })
      );
      console.log(`[Sync] Successfully generated and updated background embeddings for ${parsedEmails.length} emails in a single batch query.`);
    }
  } catch (err) {
    console.error("[Sync] Background embeddings generation error:", err);
  }
}

async function verifyReadStatusInBackground(checkIds: string[], userEmail: string) {
  console.log(`[Background Sync] Starting background verification of ${checkIds.length} candidate emails...`);
  await Promise.all(
    checkIds.map(async (id) => {
      try {
        const liveMsg = await CorsairClient.getGmailMessageDirectly(id, userEmail);
        if (liveMsg) {
          const isReadOnGmail = !(liveMsg.labelIds || []).includes("UNREAD");

          const localEmailRes = await db.select({
            read: emails.read,
          })
          .from(emails)
          .where(
            and(
              eq(emails.id, id),
              eq(emails.userEmail, userEmail)
            )
          );

          if (localEmailRes.length > 0) {
            const isReadLocally = localEmailRes[0].read;
            if (isReadLocally && !isReadOnGmail) {
              console.log(`[Background Sync] Email ${id} is locally read but unread on Gmail. Syncing to Gmail...`);
              await CorsairClient.markGmailMessageRead(id, userEmail);
            } else if (!isReadLocally && isReadOnGmail) {
              console.log(`[Background Sync] Email ${id} is locally unread but read on Gmail. Syncing to local DB...`);
              await db.update(emails)
                .set({ read: true })
                .where(
                  and(
                    eq(emails.id, id),
                    eq(emails.userEmail, userEmail)
                  )
                );
            }
          }
        }
      } catch (err) {
        console.error(`[Background Sync] Failed to check/update sync status for message ${id}:`, err);
      }
    })
  );
  console.log(`[Background Sync] Finished background verification of ${checkIds.length} candidate emails.`);
}

async function cleanDeletedEmails(skeletons: any[], userEmail: string) {
  if (skeletons.length === 0) return;
  const skeletonIds = skeletons.map((s) => s.id);

  console.log(`[Sync Cleanup] Starting background cleanup for deleted emails...`);
  try {
    const minDateRes = await db.select({
      min_date: sql<string>`MIN(${emails.date})`,
    })
    .from(emails)
    .where(
      and(
        inArray(emails.id, skeletonIds),
        eq(emails.userEmail, userEmail)
      )
    );
    const minDate = minDateRes[0]?.min_date;

    if (minDate) {
      console.log(`[Sync Cleanup] Threshold date found: ${minDate}`);
      const deleteRes = await db.delete(emails)
        .where(
          and(
            eq(emails.userEmail, userEmail),
            sql`${emails.date} >= ${minDate}`,
            notInArray(emails.id, skeletonIds)
          )
        );
      console.log(`[Sync Cleanup] Cleaned up deleted emails from database that were deleted/trashed on Gmail.`);
    } else {
      console.log(`[Sync Cleanup] No minimum date found among skeleton IDs in database, skipping cleanup.`);
    }
  } catch (err) {
    console.error("[Sync Cleanup] Error cleaning up deleted emails:", err);
  }
}

async function syncBatchOfSkeletons(skeletons: any[], userEmail: string) {
  if (skeletons.length === 0) return;

  const rawMessages = await Promise.all(
    skeletons.map(async (skeleton) => {
      try {
        return await CorsairClient.getGmailMessageDirectly(skeleton.id, userEmail);
      } catch (err) {
        console.error(`[Sync] Failed to fetch message ${skeleton.id}:`, err);
        return null;
      }
    })
  );
  const filteredMessages = rawMessages.filter(m => m !== null);

  const parsedEmails: any[] = [];
  for (const rawMsg of filteredMessages) {
    const email = CorsairClient.parseGmailMessage(rawMsg);
    if (email) {
      const fromName = email.from || "Unknown Sender";
      const fromEmail = email.fromEmail || "unknown@domain.com";
      const subject = email.subject || "(No Subject)";
      const body = email.body || "";
      const textToEmbed = `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\nBody: ${body}`;
      
      parsedEmails.push({
        id: email.id,
        fromName,
        fromEmail,
        subject,
        body,
        date: email.date || new Date().toISOString(),
        read: email.read ?? false,
        textToEmbed,
      });
    }
  }

  if (parsedEmails.length > 0) {
    const toInsert = parsedEmails.map((email) => {
      const { priority, category } = runKeywordFallback(email.subject, email.body);
      return {
        id: email.id,
        userEmail,
        fromName: email.fromName,
        fromEmail: email.fromEmail,
        subject: email.subject,
        body: email.body,
        date: email.date,
        read: email.read,
        priority,
        category,
        embedding: null,
      };
    });

    try {
      await db.insert(emails)
        .values(toInsert)
        .onConflictDoUpdate({
          target: [emails.id],
          set: {
            read: sql`EXCLUDED.read`,
            priority: sql`EXCLUDED.priority`,
            category: sql`EXCLUDED.category`,
          }
        });
      console.log(`[Sync] Successfully batch inserted/updated ${parsedEmails.length} emails in a single query.`);
    } catch (err: any) {
      console.error(`[Sync] Failed to batch insert emails into database:`, err.message);
    }
  }

  setTimeout(() => {
    generateAndSaveEmbeddings(parsedEmails, userEmail).catch((err) => {
      console.error("[Sync] Background embeddings launcher error:", err);
    });
  }, 0);
}

async function runBackgroundSyncForRemaining(
  skeletons: any[],
  userEmail: string,
) {
  console.log(
    `[Background Sync] Starting background fetch for ${skeletons.length} remaining emails for ${userEmail}`,
  );
  try {
    for (let i = 0; i < skeletons.length; i += 50) {
      const batch = skeletons.slice(i, i + 50);
      await syncBatchOfSkeletons(batch, userEmail);
    }
    console.log(
      `[Background Sync] Completed background fetch for ${userEmail}`,
    );
  } catch (err) {
    console.error(
      "[Background Sync] Fatal error during background email sync:",
      err,
    );
  }
}

function broadcastSyncComplete(userEmail: string) {
  const clientControllers = activeClients.get(userEmail);
  if (clientControllers && clientControllers.length > 0) {
    console.log(`[Sync Complete] Broadcasting sync_complete event to ${clientControllers.length} client streams for ${userEmail}`);
    const eventData = new TextEncoder().encode("data: sync_complete\n\n");
    clientControllers.forEach((controller) => {
      try {
        controller.enqueue(eventData);
      } catch (e) {
        console.error("[Sync Complete] Failed to enqueue to client controller:", e);
      }
    });
  } else {
    console.log(`[Sync Complete] No active client stream sessions for user: ${userEmail}`);
  }
}

function broadcastSyncStart(userEmail: string) {
  const clientControllers = activeClients.get(userEmail);
  if (clientControllers && clientControllers.length > 0) {
    console.log(`[Sync Start] Broadcasting sync_start event to ${clientControllers.length} client streams for ${userEmail}`);
    const eventData = new TextEncoder().encode("data: sync_start\n\n");
    clientControllers.forEach((controller) => {
      try {
        controller.enqueue(eventData);
      } catch (e) {
        console.error("[Sync Start] Failed to enqueue to client controller:", e);
      }
    });
  } else {
    console.log(`[Sync Start] No active client stream sessions for user: ${userEmail}`);
  }
}

export async function syncUserEmails(userEmail: string, syncLimit: number = 200) {
  console.log(`[Sync Service] Starting background sync pipeline for ${userEmail} (limit: ${syncLimit})...`);
  broadcastSyncStart(userEmail);
  try {
    const messageSkeletons = await CorsairClient.listGmailMessagesDirectly(userEmail, syncLimit);
    const messageSkeletonsLength = messageSkeletons.length;
    console.log(`[Sync Service] Corsair returned ${messageSkeletonsLength} message skeletons.`);

    if (messageSkeletonsLength > 0) {
      const localUnreadRes = await db.select({
        id: emails.id,
      })
      .from(emails)
      .where(
        and(
          eq(emails.userEmail, userEmail),
          eq(emails.read, false)
        )
      )
      .orderBy(desc(emails.date))
      .limit(8);

      const localUnreadIds = localUnreadRes.map((r: any) => r.id);
      const latestSkeletons = messageSkeletons.slice(0, 8).map((m: any) => m.id);

      const checkIdsSet = new Set<string>();
      localUnreadIds.forEach((id: string) => checkIdsSet.add(id));
      latestSkeletons.forEach((id: string) => checkIdsSet.add(id));
      const checkIds = Array.from(checkIdsSet).slice(0, 12);

      if (checkIds.length > 0) {
        verifyReadStatusInBackground(checkIds, userEmail).catch((err) => {
          console.error("[Sync Service] Background candidate check error:", err);
        });
      }

      const existingRes = await db.select({
        id: emails.id,
      })
      .from(emails)
      .where(eq(emails.userEmail, userEmail));
      const existingIds = new Set(existingRes.map((r: any) => r.id));

      const missingSkeletons = messageSkeletons.filter(
        (msg) => !existingIds.has(msg.id),
      );
      console.log(`[Sync Service] Found ${missingSkeletons.length} missing emails to fetch.`);

      if (missingSkeletons.length > 0) {
        console.log(`[Sync Service] Fetching and inserting ${missingSkeletons.length} missing emails...`);
        await runBackgroundSyncForRemaining(missingSkeletons, userEmail);
      }

      // Check for cached emails missing embeddings to backfill them
      const missingEmbeddingsRes = await db.select({
        id: emails.id,
        fromName: emails.fromName,
        fromEmail: emails.fromEmail,
        subject: emails.subject,
        body: emails.body,
      })
      .from(emails)
      .where(
        and(
          eq(emails.userEmail, userEmail),
          isNull(emails.embedding)
        )
      )
      .limit(100);

      if (missingEmbeddingsRes.length > 0) {
        console.log(`[Sync Service] Found ${missingEmbeddingsRes.length} existing emails missing embeddings. Generating in background...`);
        const parsedEmailsForBackfill = missingEmbeddingsRes.map((e) => ({
          id: e.id,
          textToEmbed: `From: ${e.fromName || "Unknown"} <${e.fromEmail || "unknown@domain.com"}>\nSubject: ${e.subject || ""}\nBody: ${e.body || ""}`,
        }));

        setTimeout(() => {
          generateAndSaveEmbeddings(parsedEmailsForBackfill, userEmail).catch((err) => {
            console.error("[Sync] Background backfill embeddings launcher error:", err);
          });
        }, 0);
      }

      await cleanDeletedEmails(messageSkeletons, userEmail);
    }

    broadcastSyncComplete(userEmail);
    return { success: true, count: messageSkeletonsLength };
  } catch (error) {
    console.error(`[Sync Service] Sync failed for ${userEmail}:`, error);
    throw error;
  }
}
