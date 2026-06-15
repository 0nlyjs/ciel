import { CorsairClient } from "@/lib/corsair";
import { NextResponse, after } from "next/server";
import { db, syncEventToGoogleCalendar, isMockId } from "@/lib/db";
import { calendarEvents, searchDocuments } from "@/lib/schema";
import { getEmbedding, getEmbeddingsBatch } from "@/lib/embeddings";
import { getServerSession } from "@/lib/auth";
import { eq, and, inArray, asc, sql, isNull } from "drizzle-orm";

// GET /api/calendar - List and sync all calendar events
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch currently cached events from local database
    const dbEvents = await db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        startTime: calendarEvents.startTime,
        endTime: calendarEvents.endTime,
        location: calendarEvents.location,
        description: calendarEvents.description,
        attendees: calendarEvents.attendees,
      })
      .from(calendarEvents)
      .where(eq(calendarEvents.userEmail, session.user.email));

    const dbEventsMap = new Map<string, any>();
    for (const row of dbEvents) {
      dbEventsMap.set(row.id, row);
    }

    // 2. Always sync from Corsair Google Calendar on app reload/page load
    console.log(
      `[Calendar API] Syncing latest events from Corsair Google Calendar for ${session.user.email}...`,
    );
    try {
      const corsairEvents = await CorsairClient.listCalendarEvents(
        session.user.email,
      );
      if (corsairEvents) {
        // Find which events from Corsair are new or modified compared to DB cache
        const changedEvents = corsairEvents.filter((event) => {
          const dbEvt = dbEventsMap.get(event.id);
          if (!dbEvt) return true; // New event

          // Check if any major fields differ
          const startMatches =
            dbEvt.startTime &&
            new Date(dbEvt.startTime).getTime() ===
              new Date(event.start).getTime();
          const endMatches =
            dbEvt.endTime &&
            new Date(dbEvt.endTime).getTime() === new Date(event.end).getTime();
          const titleMatches =
            dbEvt.title === (event.title || "Meeting Invite");
          const locationMatches =
            (dbEvt.location || "") === (event.location || "");
          const descMatches =
            (dbEvt.description || "") === (event.description || "");

          return (
            !startMatches ||
            !endMatches ||
            !titleMatches ||
            !locationMatches ||
            !descMatches
          );
        });

        // Generate embeddings and upsert only the new/modified events
        if (changedEvents.length > 0) {
          console.log(
            `[Calendar API] Found ${changedEvents.length} new or modified events. Generating embeddings...`,
          );
          const textsToEmbed = changedEvents.map((event) => {
            const title = event.title || "Meeting Invite";
            const location = event.location || "";
            const description = event.description || "";
            return `Title: ${title}\nLocation: ${location}\nDescription: ${description}`;
          });

          const embeddings = await getEmbeddingsBatch(textsToEmbed);

          const toInsert = changedEvents.map((event, i) => {
            return {
              id: event.id,
              userEmail: session.user.email,
              title: event.title || "Meeting Invite",
              startTime: event.start ? new Date(event.start) : new Date(),
              endTime: event.end
                ? new Date(event.end)
                : new Date(Date.now() + 1800000),
              location: event.location || "",
              attendees: event.attendees || [],
              description: event.description || "",
            };
          });

          if (toInsert.length > 0) {
            await db
              .insert(calendarEvents)
              .values(toInsert)
              .onConflictDoUpdate({
                target: [calendarEvents.id],
                set: {
                  userEmail: sql`EXCLUDED.user_email`,
                  title: sql`EXCLUDED.title`,
                  startTime: sql`EXCLUDED.start_time`,
                  endTime: sql`EXCLUDED.end_time`,
                  location: sql`EXCLUDED.location`,
                  attendees: sql`EXCLUDED.attendees`,
                  description: sql`EXCLUDED.description`,
                },
              });

            const searchDocsToInsert = toInsert.map((event, i) => {
              const embedding = embeddings ? embeddings[i] : null;
              if (!embedding) return null;
              const textToEmbed = textsToEmbed[i];
              return {
                id: `event:${event.id}`,
                sourceType: "event",
                sourceId: event.id,
                content: textToEmbed,
                embedding: embedding,
              };
            }).filter(Boolean) as any[];

            if (searchDocsToInsert.length > 0) {
              await db.insert(searchDocuments)
                .values(searchDocsToInsert)
                .onConflictDoUpdate({
                  target: [searchDocuments.id],
                  set: {
                    content: sql`EXCLUDED.content`,
                    embedding: sql`EXCLUDED.embedding`,
                  }
                });
            }

            console.log(
              `[Calendar API] Successfully batch upserted ${changedEvents.length} calendar events and embeddings.`,
            );
          }
        } else {
          console.log(`[Calendar API] No new or modified events detected.`);
        }

        // Clean up events locally that have been deleted on Google Calendar
        const timeMin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // match 90 days query window
        const liveIds = new Set(corsairEvents.map((e) => e.id));
        const deletedIds = dbEvents
          .filter((row) => {
            const start = row.startTime ? new Date(row.startTime) : null;
            const isRealId = /^[a-v0-9]+$/.test(row.id); // not a mock ID
            return (
              start && start >= timeMin && isRealId && !liveIds.has(row.id)
            );
          })
          .map((row) => row.id);

        if (deletedIds.length > 0) {
          await db
            .delete(calendarEvents)
            .where(
              and(
                inArray(calendarEvents.id, deletedIds),
                eq(calendarEvents.userEmail, session.user.email),
              ),
            );
          console.log(
            `[Calendar API] Cleaned up ${deletedIds.length} deleted events from DB.`,
          );
        }

        // Check for cached calendar events missing embeddings to backfill them
        const missingCalendarEmbeddings = await db.select({
          id: calendarEvents.id,
          title: calendarEvents.title,
          location: calendarEvents.location,
          description: calendarEvents.description,
        })
        .from(calendarEvents)
        .leftJoin(searchDocuments, eq(calendarEvents.id, searchDocuments.sourceId))
        .where(
          and(
            eq(calendarEvents.userEmail, session.user.email),
            isNull(searchDocuments.id)
          )
        )
        .limit(100);

        if (missingCalendarEmbeddings.length > 0) {
          console.log(`[Calendar API] Found ${missingCalendarEmbeddings.length} calendar events missing embeddings. Scheduling backfill...`);
          after(async () => {
            const textsToEmbed = missingCalendarEmbeddings.map((event) => {
              const title = event.title || "Meeting Invite";
              const location = event.location || "";
              const description = event.description || "";
              return `Title: ${title}\nLocation: ${location}\nDescription: ${description}`;
            });

            try {
              const embeddings = await getEmbeddingsBatch(textsToEmbed);
              if (embeddings && embeddings.length > 0) {
                await Promise.all(
                  missingCalendarEmbeddings.map(async (event, i) => {
                    const embedding = embeddings[i];
                    if (embedding) {
                      await db.insert(searchDocuments)
                        .values({
                          id: `event:${event.id}`,
                          sourceType: "event",
                          sourceId: event.id,
                          content: textsToEmbed[i],
                          embedding,
                        })
                        .onConflictDoUpdate({
                          target: [searchDocuments.id],
                          set: {
                            content: textsToEmbed[i],
                            embedding,
                          }
                        });
                    }
                  })
                );
                console.log(`[Calendar API] Successfully backfilled ${missingCalendarEmbeddings.length} calendar event embeddings in background.`);
              }
            } catch (err) {
              console.error("[Calendar API] Failed to backfill calendar embeddings in background:", err);
            }
          });
        }
      }
    } catch (syncError) {
      console.error("[Calendar API] Sync error from Corsair:", syncError);
    }

    // 3. Return the fully synchronized and updated list of events
    const rows = await db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        start: calendarEvents.startTime,
        end: calendarEvents.endTime,
        location: calendarEvents.location,
        attendees: calendarEvents.attendees,
        description: calendarEvents.description,
        contextTag: calendarEvents.contextTag,
      })
      .from(calendarEvents)
      .where(eq(calendarEvents.userEmail, session.user.email))
      .orderBy(asc(calendarEvents.startTime))
      .limit(100);

    const formattedEvents = rows.map((row) => ({
      ...row,
      attendees: Array.isArray(row.attendees) ? row.attendees : [],
      start:
        row.start instanceof Date
          ? row.start.toISOString().split(".")[0]
          : row.start,
      end:
        row.end instanceof Date ? row.end.toISOString().split(".")[0] : row.end,
    }));

    return NextResponse.json({ calendarEvents: formattedEvents });
  } catch (error: any) {
    console.error("[Calendar API GET Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}

// POST /api/calendar - Cache a new local event
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, title, start, end, location, attendees, description } =
      await req.json();

    const eventId = id || Math.random().toString();
    const cleanTitle = title || "Meeting Invite";
    const cleanStart = start || new Date().toISOString();
    const cleanEnd = end || new Date(Date.now() + 1800000).toISOString();
    const cleanLocation = location || "";
    const cleanAttendees = attendees || [];
    const cleanDescription = description || "";

    // Generate vector embedding
    const textToEmbed = `Title: ${cleanTitle}\nLocation: ${cleanLocation}\nDescription: ${cleanDescription}`;
    const embedding = await getEmbedding(textToEmbed);

    await db
      .insert(calendarEvents)
      .values({
        id: eventId,
        userEmail: session.user.email,
        title: cleanTitle,
        startTime: new Date(cleanStart),
        endTime: new Date(cleanEnd),
        location: cleanLocation,
        attendees: cleanAttendees,
        description: cleanDescription,
      })
      .onConflictDoUpdate({
        target: [calendarEvents.id],
        set: {
          userEmail: sql`EXCLUDED.user_email`,
          title: sql`EXCLUDED.title`,
          startTime: sql`EXCLUDED.start_time`,
          endTime: sql`EXCLUDED.end_time`,
          location: sql`EXCLUDED.location`,
          attendees: sql`EXCLUDED.attendees`,
          description: sql`EXCLUDED.description`,
        },
      });

    if (embedding) {
      await db.insert(searchDocuments)
        .values({
          id: `event:${eventId}`,
          sourceType: "event",
          sourceId: eventId,
          content: textToEmbed,
          embedding: embedding,
        })
        .onConflictDoUpdate({
          target: [searchDocuments.id],
          set: {
            content: textToEmbed,
            embedding: embedding,
          }
        });
    }

    // Explicitly check and trigger sync to Google Calendar if it's a mock ID
    if (isMockId(eventId)) {
      console.log(
        `[Calendar API POST] Mock calendar event detected. Syncing to Google Calendar...`,
        { eventId, userEmail: session.user.email, title: cleanTitle },
      );
      after(async () => {
        try {
          await syncEventToGoogleCalendar(
            eventId,
            session.user.email,
            cleanTitle,
            cleanStart,
            cleanEnd,
            cleanLocation,
            cleanAttendees,
            cleanDescription,
          );
          console.log(
            `[Calendar API POST] Google Calendar sync successful for event: ${eventId}`,
          );
        } catch (err) {
          console.error(
            "[Calendar API POST] Error in background calendar sync:",
            err,
          );
        }
      });
    }

    return NextResponse.json({
      success: true,
      event: {
        id: eventId,
        title: cleanTitle,
        start: cleanStart,
        end: cleanEnd,
        location: cleanLocation,
        attendees: cleanAttendees,
        description: cleanDescription,
      },
    });
  } catch (error: any) {
    console.error("[Calendar API POST Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 },
    );
  }
}
