CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"day_rollover_hour" smallint DEFAULT 4 NOT NULL,
	"reminders_on" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "users_day_rollover_hour_check" CHECK ("users"."day_rollover_hour" between 0 and 23)
);
