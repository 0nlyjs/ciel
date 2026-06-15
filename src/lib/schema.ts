import { pgTable, text, timestamp, boolean, varchar, integer, jsonb, vector, serial, unique, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }),
  verified: boolean("verified").default(false),
  image: varchar("image", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const session = pgTable("session", {
  id: varchar("id", { length: 255 }).primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  ipAddress: varchar("ipAddress", { length: 255 }),
  userAgent: varchar("userAgent", { length: 255 }),
  userId: varchar("userId", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: varchar("id", { length: 255 }).primaryKey(),
  accountId: varchar("accountId", { length: 255 }).notNull(),
  providerId: varchar("providerId", { length: 255 }).notNull(),
  userId: varchar("userId", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
  id: varchar("id", { length: 255 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const emails = pgTable("emails", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userEmail: varchar("user_email", { length: 255 }).references(() => users.email, { onDelete: "cascade" }),
  fromName: varchar("from_name", { length: 255 }),
  fromEmail: varchar("from_email", { length: 255 }),
  subject: varchar("subject", { length: 255 }),
  body: text("body"),
  date: varchar("date", { length: 100 }),
  read: boolean("read").default(false),
  priority: varchar("priority", { length: 50 }).default("medium"),
  category: varchar("category", { length: 50 }).default("work"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_emails_user_email").on(table.userEmail),
]);

export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userEmail: varchar("user_email", { length: 255 }).references(() => users.email, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  location: varchar("location", { length: 255 }),
  attendees: jsonb("attendees"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_calendar_events_user_email").on(table.userEmail),
]);

export const searchDocuments = pgTable("search_documents", {
  id: varchar("id", { length: 255 }).primaryKey(),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // 'email' or 'event'
  sourceId: varchar("source_id", { length: 255 }).notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_search_documents_source").on(table.sourceType, table.sourceId),
  index("idx_search_documents_embedding").using("hnsw", table.embedding.op("vector_cosine_ops")),
]);

export const verificationCodes = pgTable("verification_codes", {
  email: varchar("email", { length: 255 }).primaryKey().references(() => users.email, { onDelete: "cascade" }),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userEmail: varchar("user_email", { length: 255 }).primaryKey().references(() => users.email, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 50 }).default("light"),
  syncIntervalMinutes: integer("sync_interval_minutes").default(60),
  aiAutoPriority: boolean("ai_auto_priority").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userIntegrations = pgTable("user_integrations", {
  id: serial("id").primaryKey(),
  userEmail: varchar("user_email", { length: 255 }).references(() => users.email, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 50 }).notNull(),
  connectedEmail: varchar("connected_email", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("connected"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("user_integrations_user_email_provider_connected_email_key").on(table.userEmail, table.provider, table.connectedEmail),
]);

export const conversations = pgTable("conversations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userEmail: varchar("user_email", { length: 255 }).references(() => users.email, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).default("New Conversation"),
  messages: jsonb("messages").default([]),
  tokensUsed: integer("tokens_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_conversations_user_email").on(table.userEmail),
]);
