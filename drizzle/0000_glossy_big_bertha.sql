-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "conversations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(255) DEFAULT 'New Conversation' NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" varchar(255),
	"user_agent" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "search_documents" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"source_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"embedding" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"image" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"expires_at" timestamp,
	"scope" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"title" varchar(255),
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"location" varchar(255),
	"attendees" jsonb,
	"description" text,
	"context_tag" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"from_name" varchar(255),
	"from_email" varchar(255),
	"subject" varchar(255),
	"body" text,
	"date" timestamp with time zone NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"priority" varchar(50) DEFAULT 'medium' NOT NULL,
	"category" varchar(50) DEFAULT 'work' NOT NULL,
	"quick_replies" jsonb,
	"context_tag" text,
	"label_ids" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conversations_user" ON "conversations" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_session_user_id" ON "session" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_search_docs_source" ON "search_documents" USING btree ("source_type" text_ops,"source_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_messages_conversation" ON "chat_messages" USING btree ("conversation_id" text_ops,"created_at" text_ops);--> statement-breakpoint
CREATE INDEX "idx_account_user_id" ON "account" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_calendar_user_time" ON "calendar_events" USING btree ("user_id" text_ops,"start_time" text_ops,"end_time" text_ops);--> statement-breakpoint
CREATE INDEX "idx_emails_filtering" ON "emails" USING btree ("user_id" text_ops,"read" text_ops,"category" text_ops);--> statement-breakpoint
CREATE INDEX "idx_emails_user_date" ON "emails" USING btree ("user_id" timestamptz_ops,"date" timestamptz_ops);
*/