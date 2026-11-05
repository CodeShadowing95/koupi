CREATE TABLE "podcast_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itunes_id" text NOT NULL,
	"podcast_index_id" integer DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"feed_url" text NOT NULL,
	"image_url" text,
	"language" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"episode_count" integer DEFAULT 0 NOT NULL,
	"newest_episode_at" timestamp with time zone,
	"hits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "podcast_candidates_status_valid" CHECK ("podcast_candidates"."status" in ('new','dismissed')),
	CONSTRAINT "podcast_candidates_itunes_format" CHECK ("podcast_candidates"."itunes_id" ~ '^[0-9]{1,15}$'),
	CONSTRAINT "podcast_candidates_title_len" CHECK (char_length(trim("podcast_candidates"."title")) between 1 and 200),
	CONSTRAINT "podcast_candidates_feed_url_http" CHECK ("podcast_candidates"."feed_url" ~* '^https?://'),
	CONSTRAINT "podcast_candidates_counts_positive" CHECK ("podcast_candidates"."episode_count" >= 0 and "podcast_candidates"."podcast_index_id" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "podcast_candidates_itunes_idx" ON "podcast_candidates" USING btree ("itunes_id");--> statement-breakpoint
CREATE INDEX "podcast_candidates_status_idx" ON "podcast_candidates" USING btree ("status","last_seen_at" DESC NULLS LAST);