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

    // 3. Create calendar_events table with embedding vector
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id VARCHAR(255) PRIMARY KEY,
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

    console.log("[Database] Neon DB tables verified/created successfully.");
    initialized = true;
  } catch (error) {
    console.error("[Database] Error running table migration/init:", error);
    throw error;
  }
}
