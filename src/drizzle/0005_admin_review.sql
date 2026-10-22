ALTER TABLE "orders" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "bfts_awarded" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "robert_project_id" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "robert_state" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "robert_trust_score" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "robert_note" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "github_username" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_lifted_at" timestamp with time zone;