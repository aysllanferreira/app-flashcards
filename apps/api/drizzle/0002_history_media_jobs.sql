CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"deck_id" uuid,
	"s3_key" text NOT NULL,
	"format" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes_total" integer,
	"notes_done" integer DEFAULT 0 NOT NULL,
	"error" text,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_jobs_format_check" CHECK ("import_jobs"."format" in ('csv', 'apkg')),
	CONSTRAINT "import_jobs_status_check" CHECK ("import_jobs"."status" in ('pending', 'running', 'done', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"sha256" text NOT NULL,
	"s3_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_s3_key_unique" UNIQUE("s3_key"),
	CONSTRAINT "media_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "media_user_id_sha256_unique" UNIQUE("user_id","sha256"),
	CONSTRAINT "media_sha256_check" CHECK ("media"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "media_size_bytes_check" CHECK ("media"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tts_clips" (
	"hash" text PRIMARY KEY NOT NULL,
	"lang" text NOT NULL,
	"voice" text NOT NULL,
	"s3_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tts_clips_s3_key_unique" UNIQUE("s3_key"),
	CONSTRAINT "tts_clips_hash_check" CHECK ("tts_clips"."hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "note_media" (
	"user_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "note_media_pk" PRIMARY KEY("note_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid,
	"deck_id" uuid,
	"rating" smallint NOT NULL,
	"kind" text NOT NULL,
	"state_before" text NOT NULL,
	"state_after" text NOT NULL,
	"due_before" timestamp with time zone,
	"due_after" timestamp with time zone NOT NULL,
	"stability_before" real,
	"stability_after" real,
	"difficulty_before" real,
	"difficulty_after" real,
	"elapsed_days" real DEFAULT 0 NOT NULL,
	"scheduled_days" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_logs_rating_check" CHECK ("review_logs"."rating" between 1 and 4),
	CONSTRAINT "review_logs_kind_check" CHECK ("review_logs"."kind" in ('learn', 'review', 'relearn', 'manual')),
	CONSTRAINT "review_logs_states_check" CHECK ("review_logs"."state_before" in ('new', 'learning', 'review', 'relearning') and "review_logs"."state_after" in ('new', 'learning', 'review', 'relearning')),
	CONSTRAINT "review_logs_duration_ms_check" CHECK ("review_logs"."duration_ms" >= 0)
);
--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_media" ADD CONSTRAINT "note_media_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_media" ADD CONSTRAINT "note_media_note_fk" FOREIGN KEY ("note_id","user_id") REFERENCES "public"."notes"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_media" ADD CONSTRAINT "note_media_media_fk" FOREIGN KEY ("media_id","user_id") REFERENCES "public"."media"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_jobs_deck_id_idx" ON "import_jobs" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "note_media_media_id_idx" ON "note_media" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "review_logs_user_id_reviewed_at_idx" ON "review_logs" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "review_logs_card_id_reviewed_at_idx" ON "review_logs" USING btree ("card_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "review_logs_deck_id_reviewed_at_idx" ON "review_logs" USING btree ("deck_id","reviewed_at");