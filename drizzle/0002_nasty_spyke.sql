CREATE TABLE "corsair_accounts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"tenant_id" varchar(255) NOT NULL,
	"integration_id" varchar(255) NOT NULL,
	"config" jsonb,
	"dek" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "corsair_entities" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"entity_id" varchar(255) NOT NULL,
	"entity_type" varchar(255) NOT NULL,
	"version" varchar(255) NOT NULL,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "corsair_events" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"event_type" varchar(255) NOT NULL,
	"payload" jsonb,
	"status" varchar(50) DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "corsair_integrations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"config" jsonb,
	"dek" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN "password" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "ai_tone" varchar(50) DEFAULT 'professional' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "ai_directive" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "tts_voice" varchar(255) DEFAULT 'Google UK English Female' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "tts_speed" varchar(50) DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_integrations" ADD CONSTRAINT "uq_user_provider_email" UNIQUE("user_id","provider","connected_email");