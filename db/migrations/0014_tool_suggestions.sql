CREATE TABLE "tool_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"code" text NOT NULL,
	"discount" text NOT NULL,
	"evidence" text DEFAULT '' NOT NULL,
	"source_url" text NOT NULL,
	"source_title" text DEFAULT '' NOT NULL,
	"podcast_id" uuid,
	"creator_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"tool_id" uuid,
	"code_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "tool_suggestions_name_len" CHECK (char_length(trim("tool_suggestions"."name")) between 1 and 120),
	CONSTRAINT "tool_suggestions_code_len" CHECK (char_length(trim("tool_suggestions"."code")) between 1 and 120),
	CONSTRAINT "tool_suggestions_discount_len" CHECK (char_length(trim("tool_suggestions"."discount")) between 1 and 240),
	CONSTRAINT "tool_suggestions_domain_format" CHECK ("tool_suggestions"."domain" is null or "tool_suggestions"."domain" ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'),
	CONSTRAINT "tool_suggestions_source_http" CHECK ("tool_suggestions"."source_url" ~* '^https?://')
);
--> statement-breakpoint
ALTER TABLE "tool_suggestions" ADD CONSTRAINT "tool_suggestions_podcast_id_watched_sources_id_fk" FOREIGN KEY ("podcast_id") REFERENCES "public"."watched_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_suggestions" ADD CONSTRAINT "tool_suggestions_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_suggestions" ADD CONSTRAINT "tool_suggestions_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_suggestions" ADD CONSTRAINT "tool_suggestions_code_id_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tool_suggestions_tool_code_idx" ON "tool_suggestions" USING btree (lower(coalesce("domain", "name")),lower("code"));--> statement-breakpoint
CREATE INDEX "tool_suggestions_status_idx" ON "tool_suggestions" USING btree ("status");