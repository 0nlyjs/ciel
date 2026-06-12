import { CorsairClient } from "@/lib/corsair";
import { NextResponse } from "next/server";
import { dbInit, query } from "@/lib/db";
import { getEmbedding, formatVector } from "@/lib/embeddings";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET /api/calendar - List all cached calendar events from database
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbInit();

    // Sync from Corsair if local DB is empty for this user
    const checkRes = await query("SELECT count(*)::int as count FROM calendar_events WHERE user_email = $1", [session.user.email]);
    const count = checkRes.rows[0]?.count || 0;

    if (count === 0) {
      console.log(`[Calendar API] No events cached for ${session.user.email}. Syncing from Corsair Google Calendar...`);
      try {
        const corsairEvents = await CorsairClient.listCalendarEvents(session.user.email);
        if (corsairEvents && corsairEvents.length > 0) {
          for (const event of corsairEvents) {
            const eventId = event.id || Math.random().toString();
            const title = event.title || "Meeting Invite";
            const start = event.start || new Date().toISOString();
            const end = event.end || new Date(Date.now() + 1800000).toISOString();
            const location = event.location || "";
            const attendees = event.attendees || [];
            const description = event.description || "";

            const textToEmbed = `Title: ${title}\nLocation: ${location}\nDescription: ${description}`;
            const embedding = await getEmbedding(textToEmbed);
            const formattedEmbedding = formatVector(embedding);

            await query(
              `INSERT INTO calendar_events (id, user_email, title, start_time, end_time, location, attendees, description, embedding)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
               ON CONFLICT (id) DO NOTHING`,
              [eventId, session.user.email, title, start, end, location, JSON.stringify(attendees), description, formattedEmbedding]
            );
          }
        }
      } catch (syncError) {
        console.error("[Calendar API] Sync error from Corsair:", syncError);
      }
    }

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
    const session = await getServerSession(authOptions);
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
