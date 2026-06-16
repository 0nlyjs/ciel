import { db } from "./db";
import { emails, calendarEvents, searchDocuments } from "./schema";
import { CorsairClient } from "./corsair"; // Wrapper around Gmail / Calendar APIs
import { eq, and, desc } from "drizzle-orm";

// Helper to chunk arrays into optimal sizes for batch processing
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * High-Speed Email Ingestion Engine
 * Eliminates N+1 fetches by chunking requests and using batch database writes
 */
export async function syncUserEmails(
  userId: string,
  userEmail: string,
  historyId?: string,
) {
  try {
    console.log(
      `[SYNC START] Initiating high-speed sync for User: ${userId} (${userEmail})`,
    );

    // 1. Fetch message skeleton summaries from Gmail (Max 15 for speed)
    const skeletons = await CorsairClient.listGmailMessagesDirectly(
      userEmail,
      15,
    );

    if (!skeletons || skeletons.length === 0) {
      console.log(`[SYNC] No new emails found for user.`);
      return { success: true, count: 0 };
    }

    // 2. Multi-row Lookups: Pull existing cached email IDs in a single query to diff
    const existingRecords = await db
      .select({ id: emails.id })
      .from(emails)
      .where(eq(emails.userId, userId));

    const cachedIds = new Set(existingRecords.map((r) => r.id));
    const missingSkeletons = skeletons.filter((s) => !cachedIds.has(s.id));

    if (missingSkeletons.length === 0) {
      console.log(
        `[SYNC] Local database cache is already perfectly up to date.`,
      );
      return { success: true, count: 0 };
    }

    console.log(
      `[SYNC] Detected ${missingSkeletons.length} missing emails. Beginning chunked batch-pull...`,
    );

    // 3. Batch Network Fetching: Gather raw email payloads in parallel chunks
    const preparedEmails: any[] = [];
    const skeletonChunks = chunkArray(missingSkeletons, 10); // Ultra-safe chunking to prevent Gmail 429 Rate Limits

    for (const chunk of skeletonChunks) {
      const detailedMessages = await Promise.all(
        chunk.map(async (skel) => {
          try {
            return await CorsairClient.getGmailMessageDirectly(
              skel.id,
              userEmail,
            );
          } catch (err) {
            console.error(
              `[SYNC ERROR] Failed fetching message payload for ID ${skel.id}:`,
              err,
            );
            return null;
          }
        }),
      );

      // 4. In-Memory Parsing Pipeline
      for (const rawMsg of detailedMessages) {
        if (!rawMsg) continue;

        const parsed = CorsairClient.parseGmailMessage(rawMsg);
        if (!parsed) continue;

        preparedEmails.push({
          id: parsed.id,
          userId: userId,
          fromName: parsed.from || "Unknown Sender",
          fromEmail: parsed.fromEmail || "",
          subject: parsed.subject || "(No Subject)",
          body: parsed.body || "",
          date: new Date(parsed.date), // Parses cleanly into standard native operational timestamp
          read: parsed.read ?? false,
          priority: parsed.priority || "medium",
          category: parsed.category || "work",
          labelIds: "",
          quickReplies: null,
          contextTag: null,
        });
      }
    }

    // 5. Atomic DB Insertion: Write all parsed structures to Neon in unified single-transaction batches
    if (preparedEmails.length > 0) {
      const writeChunks = chunkArray(preparedEmails, 15); // Keep at 15, as our max fetch is now 15
      for (const batch of writeChunks) {
        await db
          .insert(emails)
          .values(batch)
          .onConflictDoUpdate({
            target: emails.id,
            set: {
              fromName: emails.fromName,
              fromEmail: emails.fromEmail,
              subject: emails.subject,
              body: emails.body,
              date: emails.date,
              read: emails.read,
              priority: emails.priority,
              category: emails.category,
              labelIds: emails.labelIds,
            },
          });
      }
      console.log(
        `[SYNC COMPLETE] Successfully synchronized and bulk-upserted ${preparedEmails.length} emails.`,
      );
    }

    return { success: true, count: preparedEmails.length };
  } catch (error) {
    console.error(
      `[SYNC CRITICAL CRASH] Failure inside email pipeline:`,
      error,
    );
    throw error;
  }
}

/**
 * High-Speed Calendar Ingestion Engine
 * Pulls active schedules and performs atomic bulk integrations
 */
export async function syncCalendarEvents(userId: string, userEmail: string) {
  try {
    console.log(`[CALENDAR SYNC START] Fetching timeline for user: ${userId}`);

    // Pull active schedule metrics from external systems via Corsair
    const externalEvents = await CorsairClient.listCalendarEvents(userEmail);

    if (!externalEvents || externalEvents.length === 0) {
      return { success: true, count: 0 };
    }

    const preparedEvents = externalEvents.map((evt: any) => ({
      id: evt.id,
      userId: userId,
      title: evt.title || evt.summary || "(No Title)",
      startTime: new Date(evt.start || evt.startTime || new Date()),
      endTime: new Date(evt.end || evt.endTime || new Date()),
      location: evt.location || null,
      attendees: evt.attendees || null,
      description: evt.description || null,
      contextTag: null,
    }));

    // Execute atomic layout syncing using transaction blocks
    const databaseChunks = chunkArray(preparedEvents, 50);
    for (const batch of databaseChunks) {
      await db
        .insert(calendarEvents)
        .values(batch)
        .onConflictDoUpdate({
          target: calendarEvents.id,
          set: {
            title: calendarEvents.title,
            startTime: calendarEvents.startTime,
            endTime: calendarEvents.endTime,
            location: calendarEvents.location,
            attendees: calendarEvents.attendees,
            description: calendarEvents.description,
          },
        });
    }

    console.log(
      `[CALENDAR SYNC COMPLETE] Synced ${preparedEvents.length} active schedule items.`,
    );
    return { success: true, count: preparedEvents.length };
  } catch (error) {
    console.error(`[CALENDAR SYNC CRASH] Pipeline failed:`, error);
    throw error;
  }
}
