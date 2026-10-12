CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"cloze_index" smallint DEFAULT 0 NOT NULL,
	"deck_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"state" text DEFAULT 'new' NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stability" real,
	"difficulty" real,
	"step" smallint DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"last_review_at" timestamp with time zone,
	"suspended" boolean DEFAULT false NOT NULL,
	"buried_until" timestamp with time zone,
	"flag" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cards_note_id_template_id_cloze_index_unique" UNIQUE("note_id","template_id","cloze_index"),
	CONSTRAINT "cards_state_check" CHECK ("cards"."state" in ('new', 'learning', 'review', 'relearning')),
	CONSTRAINT "cards_flag_check" CHECK ("cards"."flag" between 0 and 7),
	CONSTRAINT "cards_cloze_index_check" CHECK ("cards"."cloze_index" >= 0)
);
--> statement-breakpoint
CREATE TABLE "deck_presets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"new_per_day" integer DEFAULT 20 NOT NULL,
	"reviews_per_day" integer DEFAULT 200 NOT NULL,
	"learning_steps_s" integer[] DEFAULT '{60,600}'::integer[] NOT NULL,
	"relearning_steps_s" integer[] DEFAULT '{600}'::integer[] NOT NULL,
	"desired_retention" real DEFAULT 0.9 NOT NULL,
	"max_interval_days" integer DEFAULT 36500 NOT NULL,
	"fsrs_params" real[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deck_presets_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "deck_presets_limits_check" CHECK ("deck_presets"."new_per_day" >= 0 and "deck_presets"."reviews_per_day" >= 0 and "deck_presets"."max_interval_days" > 0),
	CONSTRAINT "deck_presets_desired_retention_check" CHECK ("deck_presets"."desired_retention" between 0.7 and 0.99)
);
--> statement-breakpoint
CREATE TABLE "decks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"preset_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decks_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "decks_user_id_parent_id_name_unique" UNIQUE NULLS NOT DISTINCT("user_id","parent_id","name"),
	CONSTRAINT "decks_name_check" CHECK (btrim("decks"."name") <> '')
);
--> statement-breakpoint
CREATE TABLE "card_templates" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"note_type_id" uuid NOT NULL,
	"name" text NOT NULL,
	"ord" smallint NOT NULL,
	"front_html" text NOT NULL,
	"back_html" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_templates_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "card_templates_note_type_id_name_unique" UNIQUE("note_type_id","name")
);
--> statement-breakpoint
CREATE TABLE "note_type_fields" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"note_type_id" uuid NOT NULL,
	"key" smallint NOT NULL,
	"name" text NOT NULL,
	"ord" smallint NOT NULL,
	"lang" text,
	"rtl" boolean DEFAULT false NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "note_type_fields_note_type_id_key_unique" UNIQUE("note_type_id","key"),
	CONSTRAINT "note_type_fields_note_type_id_name_unique" UNIQUE("note_type_id","name"),
	CONSTRAINT "note_type_fields_key_check" CHECK ("note_type_fields"."key" > 0)
);
--> statement-breakpoint
CREATE TABLE "note_types" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'standard' NOT NULL,
	"css" text DEFAULT '' NOT NULL,
	"sort_field_key" smallint DEFAULT 1 NOT NULL,
	"next_field_key" smallint DEFAULT 1 NOT NULL,
	"source_guid" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "note_types_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "note_types_kind_check" CHECK ("note_types"."kind" in ('standard', 'cloze'))
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"note_type_id" uuid NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_field" text DEFAULT '' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"guid" text DEFAULT gen_random_uuid()::text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "notes_user_id_guid_unique" UNIQUE("user_id","guid"),
	CONSTRAINT "notes_fields_check" CHECK (jsonb_typeof("notes"."fields") = 'object')
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_note_fk" FOREIGN KEY ("note_id","user_id") REFERENCES "public"."notes"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_template_fk" FOREIGN KEY ("template_id","user_id") REFERENCES "public"."card_templates"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_deck_fk" FOREIGN KEY ("deck_id","user_id") REFERENCES "public"."decks"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_presets" ADD CONSTRAINT "deck_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_parent_fk" FOREIGN KEY ("parent_id","user_id") REFERENCES "public"."decks"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_preset_fk" FOREIGN KEY ("preset_id","user_id") REFERENCES "public"."deck_presets"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_templates" ADD CONSTRAINT "card_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_templates" ADD CONSTRAINT "card_templates_note_type_fk" FOREIGN KEY ("note_type_id","user_id") REFERENCES "public"."note_types"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_type_fields" ADD CONSTRAINT "note_type_fields_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_type_fields" ADD CONSTRAINT "note_type_fields_note_type_fk" FOREIGN KEY ("note_type_id","user_id") REFERENCES "public"."note_types"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_types" ADD CONSTRAINT "note_types_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_note_type_fk" FOREIGN KEY ("note_type_id","user_id") REFERENCES "public"."note_types"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_review_queue_idx" ON "cards" USING btree ("deck_id","due_at") WHERE state <> 'new' and suspended = false;--> statement-breakpoint
CREATE INDEX "cards_new_queue_idx" ON "cards" USING btree ("deck_id","position") WHERE state = 'new' and suspended = false;--> statement-breakpoint
CREATE INDEX "cards_reminders_idx" ON "cards" USING btree ("user_id","due_at") WHERE state <> 'new' and suspended = false;--> statement-breakpoint
CREATE INDEX "cards_template_id_idx" ON "cards" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "cards_deck_id_idx" ON "cards" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "decks_preset_id_idx" ON "decks" USING btree ("preset_id");--> statement-breakpoint
CREATE INDEX "notes_note_type_id_idx" ON "notes" USING btree ("note_type_id");--> statement-breakpoint
CREATE INDEX "notes_tags_idx" ON "notes" USING gin ("tags");