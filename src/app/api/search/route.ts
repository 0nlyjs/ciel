import { NextResponse } from "next/server";
import { dbInit, query } from "@/lib/db";
import { getEmbedding, formatVector } from "@/lib/embeddings";

export async function GET(req: Request) {
  try {
    await dbInit();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const type = searchParams.get("type") || "all"; // "all" | "email" | "calendar"

    const lowerQuery = q.trim();

    // 1. If query is empty, return latest records
    if (!lowerQuery) {
      const emailResult =
        type === "calendar"
          ? []
          : (
              await query(
                `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
                 FROM emails 
                 ORDER BY created_at DESC LIMIT 50`
              )
            ).rows;

      const calendarResult =
        type === "email"
          ? []
          : (
              await query(
                `SELECT id, title, start_time as "start", end_time as "end", location, attendees, description 
                 FROM calendar_events 
                 ORDER BY start_time ASC LIMIT 50`
              )
            ).rows.map((row) => ({
              ...row,
              attendees: Array.isArray(row.attendees) ? row.attendees : [],
              // convert Date object to ISO string
              start: row.start instanceof Date ? row.start.toISOString().split(".")[0] : row.start,
              end: row.end instanceof Date ? row.end.toISOString().split(".")[0] : row.end,
            }));

      return NextResponse.json({ emails: emailResult, calendarEvents: calendarResult });
    }

    // 2. Query is present. Try Vector Search first
    const embedding = await getEmbedding(lowerQuery);

    if (embedding) {
      console.log(`[Search API] Performing fast vector search for: "${lowerQuery}"`);
      const formattedEmbedding = formatVector(embedding);

      const emailResult =
        type === "calendar"
          ? []
          : (
              await query(
                `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
                 FROM emails 
                 ORDER BY embedding <=> $1::vector 
                 LIMIT 20`,
                [formattedEmbedding]
              )
            ).rows;

      const calendarResult =
        type === "email"
          ? []
          : (
              await query(
                `SELECT id, title, start_time as "start", end_time as "end", location, attendees, description 
                 FROM calendar_events 
                 ORDER BY embedding <=> $1::vector 
                 LIMIT 20`,
                [formattedEmbedding]
              )
            ).rows.map((row) => ({
              ...row,
              attendees: Array.isArray(row.attendees) ? row.attendees : [],
              start: row.start instanceof Date ? row.start.toISOString().split(".")[0] : row.start,
              end: row.end instanceof Date ? row.end.toISOString().split(".")[0] : row.end,
            }));

      return NextResponse.json({ emails: emailResult, calendarEvents: calendarResult });
    }

    // 3. Fall back to standard ILIKE keyword search if embedding fails/OpenAI not configured
    console.log(`[Search API] Falling back to SQL ILIKE search for: "${lowerQuery}"`);
    const searchPattern = `%${lowerQuery}%`;

    const emailResult =
      type === "calendar"
        ? []
        : (
            await query(
              `SELECT id, from_name as "from", from_email as "fromEmail", subject, body, date, read, priority, category 
               FROM emails 
               WHERE subject ILIKE $1 OR body ILIKE $1 OR from_name ILIKE $1 OR from_email ILIKE $1 
               ORDER BY created_at DESC 
               LIMIT 20`,
              [searchPattern]
            )
          ).rows;

    const calendarResult =
      type === "email"
        ? []
        : (
            await query(
              `SELECT id, title, start_time as "start", end_time as "end", location, attendees, description 
               FROM calendar_events 
               WHERE title ILIKE $1 OR description ILIKE $1 OR location ILIKE $1 
               ORDER BY start_time ASC 
               LIMIT 20`,
              [searchPattern]
            )
          ).rows.map((row) => ({
            ...row,
            attendees: Array.isArray(row.attendees) ? row.attendees : [],
            start: row.start instanceof Date ? row.start.toISOString().split(".")[0] : row.start,
            end: row.end instanceof Date ? row.end.toISOString().split(".")[0] : row.end,
          }));

    return NextResponse.json({ emails: emailResult, calendarEvents: calendarResult });
  } catch (error: any) {
    console.error("[Search API Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
