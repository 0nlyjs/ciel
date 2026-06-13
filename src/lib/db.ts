import { Pool } from "@neondatabase/serverless";

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

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
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
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure verified column exists
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;");
    // Ensure password column is nullable
    await pool.query("ALTER TABLE users ALTER COLUMN password DROP NOT NULL;");

    // 3. Seed Guest User if it does not exist
    await pool.query(`
      INSERT INTO users (name, email, password, verified)
      VALUES ('Guest Node', 'guest@ciel.app', NULL, TRUE)
      ON CONFLICT (email) DO NOTHING;
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
