import { CorsairClient } from "@/lib/corsair";
import { db } from "@/lib/db";
import { emails, searchDocuments } from "@/lib/schema";
import { getEmbeddingsBatch } from "@/lib/embeddings";
import { activeClients } from "@/app/api/sync/stream/route";
import { eq, and, desc, inArray, notInArray, sql, isNull } from "drizzle-orm";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";


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

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

async function classifyEmail(
  subject: string,
  body: string
): Promise<{
  priority: "high" | "medium" | "low";
  category: "work" | "personal" | "updates" | "promotions";
  sentiment: string;
  quickReplies: string[];
  contextTag: string;
}> {
  const client = getOpenAIClient();
  if (!client) {
    const fallback = runKeywordFallback(subject, body);
    return {
      priority: fallback.priority,
      category: fallback.category,
      sentiment: "neutral",
      quickReplies: [
        "Sounds good, approved.",
        "I need more details.",
        "Let's discuss on a call."
      ],
      contextTag: fallback.category === "work" ? "Work" : "General"
    };
  }

  try {
    const prompt = `Classify the following email by priority ("high", "medium", or "low") and category ("work", "personal", "updates", or "promotions").
Also analyze the sentiment and generate 3 quick reply options and a context grouping tag.

Subject: ${subject}
Body: ${body}

Respond with a raw JSON object containing exactly these keys:
- "priority": "high" | "medium" | "low"
- "category": "work" | "personal" | "updates" | "promotions"
- "sentiment": string (e.g. "positive", "neutral", "negative", "urgent")
- "quickReplies": array of 3 distinct, short response strings (e.g. ["Sounds good, approved.", "I need more details.", "Let's discuss on a call."])
- "contextTag": a 1-to-3 word string grouping the email into a logical project or client stream (e.g. "Design Contract", "Personal", "Investor Updates")

Do not wrap in markdown code blocks.`;

    const { text } = await generateText({
      model: client("gpt-4o-mini"),
      prompt,
    });

    const cleanText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    return {
      priority: parsed.priority || "medium",
      category: parsed.category || "work",
      sentiment: parsed.sentiment || "neutral",
      quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies : [
        "Sounds good, approved.",
        "I need more details.",
        "Let's discuss on a call."
      ],
      contextTag: parsed.contextTag || "General",
    };
  } catch (error) {
    console.error("[Sync Classifier] Error during OpenAI classification, falling back:", error);
    const fallback = runKeywordFallback(subject, body);
    return {
      priority: fallback.priority,
      category: fallback.category,
      sentiment: "neutral",
      quickReplies: [
        "Sounds good, approved.",
        "I need more details.",
        "Let's discuss on a call."
      ],
      contextTag: fallback.category === "work" ? "Work" : "General"
    };
  }
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
            await db.insert(searchDocuments)
              .values({
                id: `email:${email.id}`,
                sourceType: "email",
                sourceId: email.id,
                content: email.textToEmbed,
                embedding,
              })
              .onConflictDoUpdate({
                target: [searchDocuments.id],
                set: {
                  content: email.textToEmbed,
                  embedding,
                }
              });
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

async function syncBatchOfSkeletons(skeletons: any[], userEmail: string, sentIds?: Set<string>) {
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
      const cleanBodyForEmbedding = body.substring(0, 15000);
      const textToEmbed = `From: ${fromName} <${fromEmail}>\nSubject: ${subject}\nBody: ${cleanBodyForEmbedding}`;
      
      let labelIdsArr = rawMsg.labelIds || [];
      if (sentIds?.has(email.id) && !labelIdsArr.includes("SENT")) {
        labelIdsArr = [...labelIdsArr, "SENT"];
      }
      const labelIdsStr = labelIdsArr.length > 0 ? labelIdsArr.join(",") : null;

      parsedEmails.push({
        id: email.id,
        fromName,
        fromEmail,
        subject,
        body,
        date: email.date || new Date().toISOString(),
        read: email.read ?? false,
        textToEmbed,
        labelIds: labelIdsStr,
      });
    }
  }

  if (parsedEmails.length > 0) {
    const toInsert = parsedEmails.map((email) => {
      const fallback = runKeywordFallback(email.subject, email.body);
      return {
        id: email.id,
        userEmail,
        fromName: email.fromName,
        fromEmail: email.fromEmail,
        subject: email.subject,
        body: email.body,
        date: email.date,
        read: email.read,
        priority: fallback.priority,
        category: fallback.category,
        quickReplies: [
          "Sounds good, approved.",
          "I need more details.",
          "Let's discuss on a call."
        ],
        contextTag: fallback.category === "work" ? "Work" : "General",
        labelIds: email.labelIds,
      };
    });

    try {
      await db.insert(emails)
        .values(toInsert)
        .onConflictDoUpdate({
          target: [emails.id],
          set: {
            read: sql`EXCLUDED.read`,
            labelIds: sql`EXCLUDED.label_ids`,
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
  sentIds?: Set<string>,
) {
  console.log(
    `[Background Sync] Starting background fetch for ${skeletons.length} remaining emails for ${userEmail}`,
  );
  try {
    for (let i = 0; i < skeletons.length; i += 50) {
      const batch = skeletons.slice(i, i + 50);
      await syncBatchOfSkeletons(batch, userEmail, sentIds);
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

export async function syncUserEmails(userEmail: string, syncLimit: number = 50) {
  const targetSyncLimit = syncLimit;
  console.log(`[Sync Service] Starting background sync pipeline for ${userEmail} (limit: ${targetSyncLimit})...`);
  broadcastSyncStart(userEmail);
  try {
    // Phase 1: Sync Received Mails (Inbox) first
    console.log(`[Sync Service] Phase 1: Listing received/inbox messages (limit: ${targetSyncLimit})...`);
    const inboxSkeletons = await CorsairClient.listGmailMessagesDirectly(userEmail, targetSyncLimit);
    console.log(`[Sync Service] Phase 1: Found ${inboxSkeletons.length} inbox skeletons.`);

    if (inboxSkeletons.length > 0) {
      const existingRes = await db.select({
        id: emails.id,
      })
      .from(emails)
      .where(eq(emails.userEmail, userEmail));
      const existingIds = new Set(existingRes.map((r: any) => r.id));

      const missingInboxSkeletons = inboxSkeletons.filter(
        (msg) => !existingIds.has(msg.id),
      );
      console.log(`[Sync Service] Phase 1: Found ${missingInboxSkeletons.length} missing inbox emails to fetch.`);

      if (missingInboxSkeletons.length > 0) {
        await runBackgroundSyncForRemaining(missingInboxSkeletons, userEmail);
      }

      // Run premium AI classification only on the top 10 newest emails to minimize API token usage
      try {
        const recentEmails = await db.select()
          .from(emails)
          .where(eq(emails.userEmail, userEmail))
          .orderBy(desc(emails.date))
          .limit(10);

        if (recentEmails.length > 0) {
          console.log(`[Sync Service] Running AI classification for the top ${recentEmails.length} newest emails...`);
          await Promise.all(
            recentEmails.map(async (email) => {
              const aiResult = await classifyEmail(email.subject || "", email.body || "");
              await db.update(emails)
                .set({
                  priority: aiResult.priority,
                  category: aiResult.category,
                  quickReplies: aiResult.quickReplies,
                  contextTag: aiResult.contextTag,
                })
                .where(eq(emails.id, email.id));
            })
          );
        }
      } catch (aiErr) {
        console.error("[Sync Service] Error during premium AI classification:", aiErr);
      }
    }

    // Immediately broadcast sync complete for inbox
    console.log("[Sync Service] Phase 1: Inbox sync complete. Broadcasting to client...");
    broadcastSyncComplete(userEmail);

    // Phase 2: Sync Sent Mails next
    console.log(`[Sync Service] Phase 2: Listing sent messages (limit: ${targetSyncLimit})...`);
    const sentSkeletons = await CorsairClient.listGmailMessagesDirectly(userEmail, targetSyncLimit, "in:sent");
    console.log(`[Sync Service] Phase 2: Found ${sentSkeletons.length} sent skeletons.`);

    if (sentSkeletons.length > 0) {
      const existingRes = await db.select({
        id: emails.id,
      })
      .from(emails)
      .where(eq(emails.userEmail, userEmail));
      const existingIds = new Set(existingRes.map((r: any) => r.id));

      const missingSentSkeletons = sentSkeletons.filter(
        (msg) => !existingIds.has(msg.id),
      );
      console.log(`[Sync Service] Phase 2: Found ${missingSentSkeletons.length} missing sent emails to fetch.`);

      if (missingSentSkeletons.length > 0) {
        const sentIds = new Set(sentSkeletons.map((s: any) => s.id));
        await runBackgroundSyncForRemaining(missingSentSkeletons, userEmail, sentIds);
      }

      // Clean up deleted sent/inbox skeletons
      const mergedSkeletonsMap = new Map<string, any>();
      inboxSkeletons.forEach((s) => mergedSkeletonsMap.set(s.id, s));
      sentSkeletons.forEach((s) => mergedSkeletonsMap.set(s.id, s));
      const messageSkeletons = Array.from(mergedSkeletonsMap.values());
      await cleanDeletedEmails(messageSkeletons, userEmail);
    }

    // Broadcast sync complete for sent as well
    console.log("[Sync Service] Phase 2: Sent sync complete. Broadcasting to client...");
    broadcastSyncComplete(userEmail);

    return { success: true, count: inboxSkeletons.length + sentSkeletons.length };
  } catch (error) {
    console.error(`[Sync Service] Sync failed for ${userEmail}:`, error);
    throw error;
  }
}
