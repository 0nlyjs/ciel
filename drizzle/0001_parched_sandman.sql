ALTER TABLE "calendar_events" ADD COLUMN "context_tag" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "quick_replies" jsonb;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "context_tag" text;