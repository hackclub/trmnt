CREATE TABLE "daily_activity" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"seconds" integer NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_activity_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hackatime_user_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hackatime_trust_level" text;--> statement-breakpoint
ALTER TABLE "daily_activity" ADD CONSTRAINT "daily_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_activity_day_index" ON "daily_activity" USING btree ("day");--> statement-breakpoint
CREATE VIEW "public"."hackatime_project_links" AS (
	select projects.user_id, users.hackatime_user_id, users.slack_id, projects.id as project_id,
		unnest(projects.hackatime_projects) as hackatime_project
	from projects join users on users.id = projects.user_id
);