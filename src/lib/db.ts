import { Pool } from "@neondatabase/serverless";
import { CorsairClient } from "@/lib/corsair";

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

function isMockId(id: string): boolean {
  if (typeof id !== "string") return false;
  // Google Calendar event ID format: lowercase alphanumeric [a-v0-9]
  // Mock IDs (generated via Math.random().toString()) contain a decimal dot.
  // Or other custom IDs containing uppercase, dash, dots, etc.
  return !/^[a-v0-9]+$/.test(id);
}

async function syncEventToGoogleCalendar(
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

    // 3. Call CorsairClient.createCalendarInvite
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
      await pool.query(
        `UPDATE calendar_events SET id = $1 WHERE id = $2`,
        [event.id, mockId]
      );
      console.log(`[DB Calendar Sync] Database event ID updated from ${mockId} to ${event.id}`);
    } else {
      console.warn(`[DB Calendar Sync] Did not get a real Google Calendar ID. Leaving event ${mockId} as local-only.`);
    }
  } catch (error) {
    console.error(`[DB Calendar Sync] Error syncing local event ${mockId} to Google Calendar:`, error);
  }
}

export async function query(text: string, params?: any[]) {
  const result = await pool.query(text, params);

  // Hook to detect inserts to calendar_events with a mock ID
  try {
    const isCalendarInsert = /insert\s+into\s+(public\.)?calendar_events/i.test(text);
    if (isCalendarInsert && params && params.length === 9) {
      const [id, userEmail, title, start, end, location, attendees, description] = params;
      if (typeof id === "string" && isMockId(id)) {
        console.log(`[DB Query Hook] Mock calendar event detected. Syncing to Google Calendar...`, { id, userEmail, title });
        // Start background sync
        syncEventToGoogleCalendar(id, userEmail, title, start, end, location, attendees, description).catch(err => {
          console.error("[DB Query Hook] Error in background calendar sync:", err);
        });
      }
    }
  } catch (err) {
    console.error("[DB Query Hook] Error checking calendar insert:", err);
  }

  return result;
}

let initialized = false;

export async function dbInit() {
  if (initialized) return;
  if (!connectionString) {
    console.warn("[Database] Skipping dbInit because DATABASE_URL is not set.");
    return;
  }

  try {
    // Check if the 'emails' table exists to avoid running migration queries on every container start/cold start
    const checkTableRes = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'emails');"
    );
    if (checkTableRes.rows[0]?.exists) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id VARCHAR(255) PRIMARY KEY,
          user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
          title VARCHAR(255) DEFAULT 'New Conversation',
          messages JSONB DEFAULT '[]',
          tokens_used INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await pool.query("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;");
      await pool.query("CREATE INDEX IF NOT EXISTS idx_conversations_user_email ON conversations(user_email);");
      initialized = true;
      return;
    }

    // 1. Enable the pgvector extension
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector;");

    // 2. Create users table first for credentials auth and foreign key references
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        verified BOOLEAN DEFAULT FALSE,
        image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create session table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" VARCHAR(255) PRIMARY KEY,
        "expiresAt" TIMESTAMP NOT NULL,
        "token" VARCHAR(255) NOT NULL UNIQUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ipAddress" VARCHAR(255),
        "userAgent" VARCHAR(255),
        "userId" VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create account table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" VARCHAR(255) PRIMARY KEY,
        "accountId" VARCHAR(255) NOT NULL,
        "providerId" VARCHAR(255) NOT NULL,
        "userId" VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP,
        "refreshTokenExpiresAt" TIMESTAMP,
        "scope" TEXT,
        "password" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create verification table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" VARCHAR(255) PRIMARY KEY,
        "identifier" VARCHAR(255) NOT NULL,
        "value" VARCHAR(255) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Seed Guest User if it does not exist
    await pool.query(`
      INSERT INTO users (id, name, email, password, verified)
      VALUES ('guest-id', 'Guest Node', 'guest@ciel.app', NULL, TRUE)
      ON CONFLICT (email) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
      VALUES ('guest-account-id', 'guest@ciel.app', 'credential', 'guest-id', '38178c654e34df255fbdca65daba323d:8301a1c0360b57632b48c502952970b306412bd89320ece0add0faa79ecb7453c70b58e7ae79314eee8fa4df603e28dcd44894272ab0680c2038f05c170ea979', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 4. Create emails table with embedding vector
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id VARCHAR(255) PRIMARY KEY,
        user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
        from_name VARCHAR(255),
        from_email VARCHAR(255),
        subject VARCHAR(255),
        body TEXT,
        date VARCHAR(100),
        read BOOLEAN DEFAULT FALSE,
        priority VARCHAR(50) DEFAULT 'medium',
        category VARCHAR(50) DEFAULT 'work',
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure user_email column exists in emails
    await pool.query("ALTER TABLE emails ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);");

    // 5. Create calendar_events table with embedding vector
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id VARCHAR(255) PRIMARY KEY,
        user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
        title VARCHAR(255),
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        location VARCHAR(255),
        attendees JSONB,
        description TEXT,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure user_email column exists in calendar_events
    await pool.query("ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);");

    // 6. Create verification codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        email VARCHAR(255) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Create user settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_email VARCHAR(255) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
        theme VARCHAR(50) DEFAULT 'dark',
        sync_interval_minutes INTEGER DEFAULT 60,
        ai_auto_priority BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. Create user integrations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_integrations (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        connected_email VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'connected',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_email, provider, connected_email)
      );
    `);


    // Retroactively drop/apply constraints for existing tables
    await pool.query("ALTER TABLE emails DROP CONSTRAINT IF EXISTS fk_emails_user_email;");
    await pool.query("ALTER TABLE emails ADD CONSTRAINT fk_emails_user_email FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE;");

    await pool.query("ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS fk_calendar_events_user_email;");
    await pool.query("ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_user_email FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE;");

    await pool.query("ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS fk_verification_codes_email;");
    await pool.query("ALTER TABLE verification_codes ADD CONSTRAINT fk_verification_codes_email FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE;");

    // 7. Create database query indexes for quick access and security boundaries
    await pool.query("CREATE INDEX IF NOT EXISTS idx_emails_user_email ON emails(user_email);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_calendar_events_user_email ON calendar_events(user_email);");

    // 8. Create pgvector HNSW indexes for optimized semantic search
    await pool.query("CREATE INDEX IF NOT EXISTS idx_emails_embedding ON emails USING hnsw (embedding vector_cosine_ops);");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_calendar_events_embedding ON calendar_events USING hnsw (embedding vector_cosine_ops);");

    // 9. Create conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(255) PRIMARY KEY,
        user_email VARCHAR(255) REFERENCES users(email) ON DELETE CASCADE,
        title VARCHAR(255) DEFAULT 'New Conversation',
        messages JSONB DEFAULT '[]',
        tokens_used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0;");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_conversations_user_email ON conversations(user_email);");

    console.log("[Database] Neon DB tables verified/created successfully with security optimizations.");
    initialized = true;
  } catch (error) {
    console.error("[Database] Error running table migration/init:", error);
    throw error;
  }
}
