CREATE TABLE "youtube_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_id" uuid,
	"category_slug" text,
	"variant" text NOT NULL,
	"query" text NOT NULL,
	"videos" integer DEFAULT 0 NOT NULL,
	"new_videos" integer DEFAULT 0 NOT NULL,
	"codes" integer DEFAULT 0 NOT NULL,
	"searched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "youtube_searches_subject" CHECK ("youtube_searches"."tool_id" is not null or "youtube_searches"."category_slug" is not null),
	CONSTRAINT "youtube_searches_variant_len" CHECK (char_length("youtube_searches"."variant") between 1 and 40),
	CONSTRAINT "youtube_searches_counts_positive" CHECK ("youtube_searches"."videos" >= 0 and "youtube_searches"."new_videos" >= 0 and "youtube_searches"."codes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "youtube_seen_videos" (
	"video_id" text PRIMARY KEY NOT NULL,
	"channel_id" text,
	"channel_title" text DEFAULT '' NOT NULL,
	"tool_id" uuid,
	"query" text NOT NULL,
	"codes" integer DEFAULT 0 NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "youtube_seen_videos_id_format" CHECK ("youtube_seen_videos"."video_id" ~ '^[A-Za-z0-9_-]{1,20}$'),
	CONSTRAINT "youtube_seen_videos_codes_positive" CHECK ("youtube_seen_videos"."codes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "youtube_searches" ADD CONSTRAINT "youtube_searches_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_searches" ADD CONSTRAINT "youtube_searches_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "youtube_seen_videos" ADD CONSTRAINT "youtube_seen_videos_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "youtube_searches_tool_idx" ON "youtube_searches" USING btree ("tool_id","searched_at");--> statement-breakpoint
CREATE INDEX "youtube_searches_category_idx" ON "youtube_searches" USING btree ("category_slug","searched_at");--> statement-breakpoint
CREATE INDEX "youtube_seen_videos_channel_idx" ON "youtube_seen_videos" USING btree ("channel_id");