import {
  pgTable,
  varchar,
  boolean,
  timestamp,
  text,
  integer,
  jsonb,
  index,
  serial,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  verified: boolean("verified").default(false).notNull(),
  image: varchar("image", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable(
  "session",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 255 }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_session_user_id").on(table.userId)],
);

export const accounts = pgTable(
  "account",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    expiresAt: timestamp("expires_at"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    scope: text("scope"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_account_user_id").on(table.userId)],
);

export const emails = pgTable(
  "emails",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromName: varchar("from_name", { length: 255 }),
    fromEmail: varchar("from_email", { length: 255 }),
    subject: varchar("subject", { length: 255 }),
    body: text("body"),
    date: timestamp("date", { withTimezone: true }).notNull(),
    read: boolean("read").default(false).notNull(),
    priority: varchar("priority", { length: 50 }).default("medium").notNull(),
    category: varchar("category", { length: 50 }).default("work").notNull(),
    quickReplies: jsonb("quick_replies"),
    contextTag: text("context_tag"),
    labelIds: text("label_ids"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_emails_user_date").on(table.userId, table.date),
    index("idx_emails_filtering").on(table.userId, table.read, table.category),
  ],
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    location: varchar("location", { length: 255 }),
    attendees: jsonb("attendees"),
    description: text("description"),
    contextTag: text("context_tag"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_calendar_user_time").on(
      table.userId,
      table.startTime,
      table.endTime,
    ),
  ],
);

export const conversations = pgTable(
  "conversations",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 })
      .default("New Conversation")
      .notNull(),
    tokensUsed: integer("tokens_used").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_conversations_user").on(table.userId)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: varchar("conversation_id", { length: 255 })
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_messages_conversation").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const searchDocuments = pgTable(
  "search_documents",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    sourceType: varchar("source_type", { length: 50 }).notNull(),
    sourceId: varchar("source_id", { length: 255 }).notNull(),
    content: text("content").notNull(),
    embedding: text("embedding").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_search_docs_source").on(table.sourceType, table.sourceId),
  ],
);

export const userSettings = pgTable("user_settings", {
  userId: varchar("user_id", { length: 255 })
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 50 }).default("light").notNull(),
  syncIntervalMinutes: integer("sync_interval_minutes").default(60).notNull(),
  aiAutoPriority: boolean("ai_auto_priority").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userIntegrations = pgTable(
  "user_integrations",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    connectedEmail: varchar("connected_email", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).default("connected").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_integrations_user").on(table.userId),
    unique("uq_user_provider_email").on(
      table.userId,
      table.provider,
      table.connectedEmail,
    ),
  ],
);

export const verification = pgTable("verification", {
  id: varchar("id", { length: 255 }).primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  emails: many(emails),
  calendarEvents: many(calendarEvents),
  conversations: many(conversations),
  settings: one(userSettings),
  integrations: many(userIntegrations),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(chatMessages),
}));

// ==========================================
// 6. CORSAIR SDK INTERNAL TABLES
// ==========================================
export const corsairIntegrations = pgTable("corsair_integrations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  config: jsonb("config"),
  dek: varchar("dek", { length: 255 }),
});

export const corsairAccounts = pgTable("corsair_accounts", {
  id: varchar("id", { length: 255 }).primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  tenantId: varchar("tenant_id", { length: 255 }).notNull(),
  integrationId: varchar("integration_id", { length: 255 }).notNull(),
  config: jsonb("config"),
  dek: varchar("dek", { length: 255 }),
});

export const corsairEntities = pgTable("corsair_entities", {
  id: varchar("id", { length: 255 }).primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  entityId: varchar("entity_id", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 255 }).notNull(),
  version: varchar("version", { length: 255 }).notNull(),
  data: jsonb("data"),
});

export const corsairEvents = pgTable("corsair_events", {
  id: varchar("id", { length: 255 }).primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 255 }).notNull(),
  payload: jsonb("payload"),
  status: varchar("status", { length: 50 }).default("pending"),
});
