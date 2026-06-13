import { CorsairClient } from "@/lib/corsair";
import { query } from "@/lib/db";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getEmbeddingsBatch, formatVector } from "@/lib/embeddings";
import { activeClients } from "@/app/api/sync/stream/route";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return createOpenAI({ apiKey });
};

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

async function classifyEmail(
  subject: string,
  body: string,
): Promise<{
  priority: "high" | "medium" | "low";
  category: "work" | "personal" | "updates" | "promotions";
}> {
  const client = getOpenAIClient();
  if (!client) {
    return runKeywordFallback(subject, body);
  }

  try {
    const prompt = `Classify the following email by priority ("high", "medium", or "low") and category ("work", "personal", "updates", or "promotions").
Subject: ${subject}
Body: ${body}

Respond with a raw JSON object containing exactly two keys: "priority" and "category". Do not wrap in markdown code blocks.`;

    const { text } = await generateText({
      model: client("gpt-4o-mini"),
      prompt,
    });

    const cleanText = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleanText);

    return {
      priority: parsed.priority || "medium",
      category: parsed.category || "work",
    };
  } catch (error) {
    console.error(
      "[Classifier] Error during OpenAI classification, falling back:",
      error,
    );
    return runKeywordFallback(subject, body);
  }
}

async function generateAndSaveEmbeddings(parsedEmails: any[], userEmail: string) {
  const textsToEmbed = parsedEmails.map(e => e.textToEmbed);
  if (textsToEmbed.length === 0) return;

  try {
    const embeddings = await getEmbeddingsBatch(textsToEmbed);
    if (embeddings && embeddings.length > 0) {
      const values: any[] = [];
      const valueStrings: string[] = [];
      let paramIndex = 1;

      for (let i = 0; i < parsedEmails.length; i++) {
        const email = parsedEmails[i];
        const embedding = embeddings[i];
        if (embedding) {
          const formatted = formatVector(embedding);
          valueStrings.push(`($${paramIndex}, $${paramIndex + 1}::vector)`);
          values.push(email.id, formatted);
          paramIndex += 2;
        }
      }

      if (values.length > 0) {
        values.push(userEmail);
        const userEmailParam = `$${paramIndex}`;
        await query(
          `UPDATE emails 
           SET embedding = temp.val::vector
           FROM (VALUES ${valueStrings.join(", ")}) AS temp(id, val)
           WHERE emails.id = temp.id AND emails.user_email = ${userEmailParam}`,
          values
        );
        console.log(`[Sync] Successfully generated and updated background embeddings for ${parsedEmails.length} emails in a single batch query.`);
      }
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

          const localEmailRes = await query(
            "SELECT read FROM emails WHERE id = $1 AND user_email = $2",
            [id, userEmail]
          );

          if (localEmailRes.rows.length > 0) {
            const isReadLocally = localEmailRes.rows[0].read;
            if (isReadLocally && !isReadOnGmail) {
              console.log(`[Background Sync] Email ${id} is locally read but unread on Gmail. Syncing to Gmail...`);
              await CorsairClient.markGmailMessageRead(id, userEmail);
            } else if (!isReadLocally && isReadOnGmail) {
              console.log(`[Background Sync] Email ${id} is locally unread but read on Gmail. Syncing to local DB...`);
              await query(
                "UPDATE emails SET read = TRUE WHERE id = $1 AND user_email = $2",
                [id, userEmail]
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
    const minDateRes = await query(
      "SELECT MIN(date) as min_date FROM emails WHERE id = ANY($1) AND user_email = $2",
      [skeletonIds, userEmail]
    );
    const minDate = minDateRes.rows[0]?.min_date;

    if (minDate) {
      console.log(`[Sync Cleanup] Threshold date found: ${minDate}`);
      const deleteRes = await query(
        `DELETE FROM emails 
         WHERE user_email = $1 
           AND date >= $2 
           AND NOT (id = ANY($3))`,
        [userEmail, minDate, skeletonIds]
      );
      if (deleteRes.rowCount && deleteRes.rowCount > 0) {
        console.log(`[Sync Cleanup] Deleted ${deleteRes.rowCount} emails from database that were deleted/trashed on Gmail.`);
      }
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
    const values: any[] = [];
    const valueStrings: string[] = [];
    let paramIndex = 1;

    for (const email of parsedEmails) {
      const { priority, category } = runKeywordFallback(email.subject, email.body);
      valueStrings.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, NULL)`
      );
      values.push(
        email.id,
        userEmail,
        email.fromName,
        email.fromEmail,
        email.subject,
        email.body,
        email.date,
        email.read,
        priority,
        category
      );
      paramIndex += 10;
    }

    try {
      await query(
        `INSERT INTO emails (id, user_email, from_name, from_email, subject, body, date, read, priority, category, embedding)
         VALUES ${valueStrings.join(", ")}
         ON CONFLICT (id) DO UPDATE SET 
           read = EXCLUDED.read,
           priority = EXCLUDED.priority,
           category = EXCLUDED.category`,
        values
      );
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
      const localUnreadRes = await query(
        "SELECT id FROM emails WHERE user_email = $1 AND read = FALSE ORDER BY date DESC LIMIT 8",
        [userEmail],
      );
      const localUnreadIds = localUnreadRes.rows.map((r: any) => r.id);
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

      const existingRes = await query(
        "SELECT id FROM emails WHERE user_email = $1",
        [userEmail],
      );
      const existingIds = new Set(existingRes.rows.map((r: any) => r.id));

      const missingSkeletons = messageSkeletons.filter(
        (msg) => !existingIds.has(msg.id),
      );
      console.log(`[Sync Service] Found ${missingSkeletons.length} missing emails to fetch.`);

      if (missingSkeletons.length > 0) {
        console.log(`[Sync Service] Fetching and inserting ${missingSkeletons.length} missing emails...`);
        await runBackgroundSyncForRemaining(missingSkeletons, userEmail);
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
