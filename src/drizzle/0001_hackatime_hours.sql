ALTER TABLE "projects" ADD COLUMN "seconds_logged" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hackatime_synced_at" timestamp with time zone;