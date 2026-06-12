import { NextResponse } from "next/server";
import { dbInit, query } from "@/lib/db";
import { getEmbedding, formatVector } from "@/lib/embeddings";

// GET /api/calendar - List all cached calendar events
export async function GET() {
  try {
    await dbInit();

    const { rows } = await query(
      `SELECT id, title, start_time as "start", end_time as "end", location, attendees, description 
       FROM calendar_events 
       ORDER BY start_time ASC LIMIT 100`
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
      `INSERT INTO calendar_events (id, title, start_time, end_time, location, attendees, description, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         location = EXCLUDED.location,
         attendees = EXCLUDED.attendees,
         description = EXCLUDED.description,
         embedding = EXCLUDED.embedding`,
      [
        eventId,
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
