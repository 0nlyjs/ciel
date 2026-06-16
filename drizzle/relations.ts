import { relations } from "drizzle-orm/relations";
import { users, conversations, session, chatMessages, account, calendarEvents, emails } from "./schema";

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	user: one(users, {
		fields: [conversations.userId],
		references: [users.id]
	}),
	chatMessages: many(chatMessages),
}));

export const usersRelations = relations(users, ({many}) => ({
	conversations: many(conversations),
	sessions: many(session),
	accounts: many(account),
	calendarEvents: many(calendarEvents),
	emails: many(emails),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(users, {
		fields: [session.userId],
		references: [users.id]
	}),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	conversation: one(conversations, {
		fields: [chatMessages.conversationId],
		references: [conversations.id]
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(users, {
		fields: [account.userId],
		references: [users.id]
	}),
}));

export const calendarEventsRelations = relations(calendarEvents, ({one}) => ({
	user: one(users, {
		fields: [calendarEvents.userId],
		references: [users.id]
	}),
}));

export const emailsRelations = relations(emails, ({one}) => ({
	user: one(users, {
		fields: [emails.userId],
		references: [users.id]
	}),
}));