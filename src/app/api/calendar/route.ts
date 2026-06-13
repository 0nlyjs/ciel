import { CorsairClient } from "@/lib/corsair";
import { NextResponse } from "next/server";
import { dbInit, query } from "@/lib/db";
import { getEmbedding, getEmbeddingsBatch, formatVector } from "@/lib/embeddings";
import { getServerSession } from "@/lib/auth";


// GET /api/calendar - List and sync all calendar events
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    // 1. Fetch currently cached events from local database
    const { rows: dbEvents } = await query(
      `SELECT id, title, start_time, end_time, location, description, attendees 
       FROM calendar_events 
       WHERE user_email = $1`,
      [session.user.email]
    );

    const dbEventsMap = new Map<string, any>();
    for (const row of dbEvents) {
      dbEventsMap.set(row.id, row);
    }

    // 2. Always sync from Corsair Google Calendar on app reload/page load
    console.log(`[Calendar API] Syncing latest events from Corsair Google Calendar for ${session.user.email}...`);
    try {
      const corsairEvents = await CorsairClient.listCalendarEvents(session.user.email);
      if (corsairEvents) {
        // Find which events from Corsair are new or modified compared to DB cache
        const changedEvents = corsairEvents.filter(event => {
          const dbEvt = dbEventsMap.get(event.id);
          if (!dbEvt) return true; // New event

          // Check if any major fields differ
          const startMatches = new Date(dbEvt.start_time).getTime() === new Date(event.start).getTime();
          const endMatches = new Date(dbEvt.end_time).getTime() === new Date(event.end).getTime();
          const titleMatches = dbEvt.title === (event.title || "Meeting Invite");
          const locationMatches = (dbEvt.location || "") === (event.location || "");
          const descMatches = (dbEvt.description || "") === (event.description || "");

          return !startMatches || !endMatches || !titleMatches || !locationMatches || !descMatches;
        });

        // Generate embeddings and upsert only the new/modified events
        if (changedEvents.length > 0) {
          console.log(`[Calendar API] Found ${changedEvents.length} new or modified events. Generating embeddings...`);
          const textsToEmbed = changedEvents.map(event => {
            const title = event.title || "Meeting Invite";
            const location = event.location || "";
            const description = event.description || "";
            return `Title: ${title}\nLocation: ${location}\nDescription: ${description}`;
          });

          const embeddings = await getEmbeddingsBatch(textsToEmbed);

          const values: any[] = [];
          const valueStrings: string[] = [];
          let paramIndex = 1;

          for (let i = 0; i < changedEvents.length; i++) {
            const event = changedEvents[i];
            const embedding = embeddings ? embeddings[i] : null;
            const formattedEmbedding = formatVector(embedding);

            const eventId = event.id;
            const title = event.title || "Meeting Invite";
            const start = event.start || new Date().toISOString();
            const end = event.end || new Date(Date.now() + 1800000).toISOString();
            const location = event.location || "";
            const attendees = event.attendees || [];
            const description = event.description || "";

            valueStrings.push(
              `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}::vector)`
            );
            values.push(
              eventId,
              session.user.email,
              title,
              start,
              end,
              location,
              JSON.stringify(attendees),
              description,
              formattedEmbedding
            );
            paramIndex += 9;
          }

          if (values.length > 0) {
            await query(
              `INSERT INTO calendar_events (id, user_email, title, start_time, end_time, location, attendees, description, embedding)
               VALUES ${valueStrings.join(", ")}
               ON CONFLICT (id) DO UPDATE SET
                 user_email = EXCLUDED.user_email,
                 title = EXCLUDED.title,
                 start_time = EXCLUDED.start_time,
                 end_time = EXCLUDED.end_time,
                 location = EXCLUDED.location,
                 attendees = EXCLUDED.attendees,
                 description = EXCLUDED.description,
                 embedding = EXCLUDED.embedding`,
              values
            );
            console.log(`[Calendar API] Successfully batch upserted ${changedEvents.length} calendar events.`);
          }
        } else {
          console.log(`[Calendar API] No new or modified events detected.`);
        }

        // Clean up events locally that have been deleted on Google Calendar
        const timeMin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // match 90 days query window
        const liveIds = new Set(corsairEvents.map(e => e.id));
        const deletedIds = dbEvents
          .filter(row => {
            const start = new Date(row.start_time);
            const isRealId = /^[a-v0-9]+$/.test(row.id); // not a mock ID
            return start >= timeMin && isRealId && !liveIds.has(row.id);
          })
          .map(row => row.id);

        if (deletedIds.length > 0) {
          await query(
            `DELETE FROM calendar_events WHERE id = ANY($1::varchar[]) AND user_email = $2`,
            [deletedIds, session.user.email]
          );
          console.log(`[Calendar API] Cleaned up ${deletedIds.length} deleted events from DB.`);
        }
      }
    } catch (syncError) {
      console.error("[Calendar API] Sync error from Corsair:", syncError);
    }

    // 3. Return the fully synchronized and updated list of events
    const { rows } = await query(
      `SELECT id, title, start_time as "start", end_time as "end", location, attendees, description 
       FROM calendar_events 
       WHERE user_email = $1
       ORDER BY start_time ASC LIMIT 100`,
      [session.user.email]
    );

    const formattedEvents = rows.map((row) => ({
      ...row,
      attendees: Array.isArray(row.attendees) ? row.attendees : [],
      start: row.start instanceof Date ? row.start.toISOString().split(".")[0] : row.start,
      end: row.end instanceof Date ? row.end.toISOString().split(".")[0] : row.end,
    }));

    return NextResponse.json({ calendarEvents: formattedEvents });
  } catch (error: any) {
    console.error("[Calendar API GET Error]", error);
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}

// POST /api/calendar - Cache a new local event
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    const { id, title, start, end, location, attendees, description } = await req.json();

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
    const formattedEmbedding = formatVector(embedding);

    await query(
      `INSERT INTO calendar_events (id, user_email, title, start_time, end_time, location, attendees, description, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
       ON CONFLICT (id) DO UPDATE SET
         user_email = EXCLUDED.user_email,
         title = EXCLUDED.title,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         location = EXCLUDED.location,
         attendees = EXCLUDED.attendees,
         description = EXCLUDED.description,
         embedding = EXCLUDED.embedding`,
      [
        eventId,
        session.user.email,
        cleanTitle,
        cleanStart,
        cleanEnd,
        cleanLocation,
        JSON.stringify(cleanAttendees),
        cleanDescription,
        formattedEmbedding,
      ]
    );

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
    return NextResponse.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
