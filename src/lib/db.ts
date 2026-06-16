import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import { eq } from "drizzle-orm";


const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database operations will fail or be bypassed.");
}

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
};

export const pool = globalForDb.pool ?? new Pool({
  connectionString,
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });

export function isMockId(id: string): boolean {
  if (typeof id !== "string") return false;
  // Google Calendar event ID format: lowercase alphanumeric [a-v0-9]
  // Mock IDs (generated via Math.random().toString()) contain a decimal dot.
  // Or other custom IDs containing uppercase, dash, dots, etc.
  return !/^[a-v0-9]+$/.test(id);
}

export async function syncEventToGoogleCalendar(
  mockId: string,
  userEmail: string,
  title: string,
  start: any,
  end: any,
  location: string,
  attendees: any,
  description: string
) {
  try {
    // 1. Parse attendees
    let cleanAttendees: string[] = [];
    if (Array.isArray(attendees)) {
      cleanAttendees = attendees;
    } else if (typeof attendees === "string") {
      try {
        const parsed = JSON.parse(attendees);
        if (Array.isArray(parsed)) {
          cleanAttendees = parsed;
        } else if (typeof parsed === "string") {
          cleanAttendees = [parsed];
        }
      } catch {
        cleanAttendees = [attendees];
      }
    }

    // 2. Format start/end times to ISO strings
    const startISO = start instanceof Date ? start.toISOString() : new Date(start).toISOString();
    const endISO = end instanceof Date ? end.toISOString() : new Date(end).toISOString();

    console.log(`[DB Calendar Sync] Syncing event to Google Calendar via Corsair: "${title}" for ${userEmail}`);

    // 3. Call CorsairClient.createCalendarInvite dynamically
    const { CorsairClient } = await import("@/lib/corsair");
    const event = await CorsairClient.createCalendarInvite(
      title,
      cleanAttendees,
      startISO,
      endISO,
      location || "",
      description || "",
      userEmail
    );

    // 4. Check if we got a real Google Calendar ID
    if (event && event.id && !isMockId(event.id)) {
      console.log(`[DB Calendar Sync] Successfully created Google Calendar event. New ID: ${event.id}. Updating DB...`);

      // Update the DB record's ID to the real Google Calendar ID
      await db.update(schema.calendarEvents)
        .set({ id: event.id })
        .where(eq(schema.calendarEvents.id, mockId));
      console.log(`[DB Calendar Sync] Database event ID updated from ${mockId} to ${event.id}`);
      return event;
    } else {
      console.warn(`[DB Calendar Sync] Did not get a real Google Calendar ID. Leaving event ${mockId} as local-only.`);
      return event;
    }
  } catch (error) {
    console.error(`[DB Calendar Sync] Error syncing local event ${mockId} to Google Calendar:`, error);
    throw error;
  }
}

export async function dbInit() {
  // Schema is managed dynamically via Drizzle migrations/push.
  // We perform a simple verification query to make sure the database is reachable.
  if (!connectionString) {
    console.warn("[Database] Skipping dbInit because DATABASE_URL is not set.");
    return;
  }
  try {
    await pool.query("SELECT 1;");
    console.log("[Database] Neon DB connection verified.");
  } catch (error) {
    console.error("[Database] Failed to connect to database:", error);
    throw error;
  }
}
