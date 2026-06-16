CREATE TABLE "user_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"connected_email" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'connected' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"theme" varchar(50) DEFAULT 'light' NOT NULL,
	"sync_interval_minutes" integer DEFAULT 60 NOT NULL,
	"ai_auto_priority" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "idx_conversations_user";--> statement-breakpoint
DROP INDEX "idx_session_user_id";--> statement-breakpoint
DROP INDEX "idx_search_docs_source";--> statement-breakpoint
DROP INDEX "idx_messages_conversation";--> statement-breakpoint
DROP INDEX "idx_account_user_id";--> statement-breakpoint
DROP INDEX "idx_calendar_user_time";--> statement-breakpoint
DROP INDEX "idx_emails_filtering";--> statement-breakpoint
DROP INDEX "idx_emails_user_date";--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "access_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_integrations_user" ON "user_integrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_user" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_session_user_id" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_search_docs_source" ON "search_documents" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation" ON "chat_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_account_user_id" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_calendar_user_time" ON "calendar_events" USING btree ("user_id","start_time","end_time");--> statement-breakpoint
CREATE INDEX "idx_emails_filtering" ON "emails" USING btree ("user_id","read","category");--> statement-breakpoint
CREATE INDEX "idx_emails_user_date" ON "emails" USING btree ("user_id","date");