import { pgTable, index, foreignKey, varchar, integer, timestamp, unique, text, serial, boolean, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const conversations = pgTable("conversations", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	title: varchar({ length: 255 }).default('New Conversation').notNull(),
	tokensUsed: integer("tokens_used").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_conversations_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "conversations_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	token: varchar({ length: 255 }).notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	ipAddress: varchar("ip_address", { length: 255 }),
	userAgent: varchar("user_agent", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_session_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "session_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const searchDocuments = pgTable("search_documents", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	sourceType: varchar("source_type", { length: 50 }).notNull(),
	sourceId: varchar("source_id", { length: 255 }).notNull(),
	content: text().notNull(),
	embedding: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_search_docs_source").using("btree", table.sourceType.asc().nullsLast().op("text_ops"), table.sourceId.asc().nullsLast().op("text_ops")),
]);

export const chatMessages = pgTable("chat_messages", {
	id: serial().primaryKey().notNull(),
	conversationId: varchar("conversation_id", { length: 255 }).notNull(),
	role: varchar({ length: 50 }).notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_messages_conversation").using("btree", table.conversationId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "chat_messages_conversation_id_conversations_id_fk"
		}).onDelete("cascade"),
]);

export const users = pgTable("users", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	name: varchar({ length: 255 }),
	email: varchar({ length: 255 }).notNull(),
	verified: boolean().default(false).notNull(),
	image: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const account = pgTable("account", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	accountId: varchar("account_id", { length: 255 }).notNull(),
	providerId: varchar("provider_id", { length: 255 }).notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	scope: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_account_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "account_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const calendarEvents = pgTable("calendar_events", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	title: varchar({ length: 255 }),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }).notNull(),
	location: varchar({ length: 255 }),
	attendees: jsonb(),
	description: text(),
	contextTag: text("context_tag"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_calendar_user_time").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.startTime.asc().nullsLast().op("text_ops"), table.endTime.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "calendar_events_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const emails = pgTable("emails", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	fromName: varchar("from_name", { length: 255 }),
	fromEmail: varchar("from_email", { length: 255 }),
	subject: varchar({ length: 255 }),
	body: text(),
	date: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	read: boolean().default(false).notNull(),
	priority: varchar({ length: 50 }).default('medium').notNull(),
	category: varchar({ length: 50 }).default('work').notNull(),
	quickReplies: jsonb("quick_replies"),
	contextTag: text("context_tag"),
	labelIds: text("label_ids"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_emails_filtering").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.read.asc().nullsLast().op("text_ops"), table.category.asc().nullsLast().op("text_ops")),
	index("idx_emails_user_date").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.date.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "emails_user_id_users_id_fk"
		}).onDelete("cascade"),
]);
