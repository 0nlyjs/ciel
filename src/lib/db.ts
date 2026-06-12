import { Pool } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set. Database operations will fail or be bypassed.");
}

export const pool = new Pool({
  connectionString,
});

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
    // 1. Enable the pgvector extension
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector;");

    // 2. Create emails table with embedding vector
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id VARCHAR(255) PRIMARY KEY,
        user_email VARCHAR(255),
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

    // 3. Create calendar_events table with embedding vector
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id VARCHAR(255) PRIMARY KEY,
        user_email VARCHAR(255),
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

    // 4. Create users table for credentials auth
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

    // 5. Create verification codes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        email VARCHAR(255) PRIMARY KEY,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("[Database] Neon DB tables verified/created successfully.");
    initialized = true;
  } catch (error) {
    console.error("[Database] Error running table migration/init:", error);
    throw error;
  }
}
