CREATE TABLE "categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_slug_format" CHECK ("categories"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "categories_name_len" CHECK (char_length(trim("categories"."name")) between 1 and 80)
);
--> statement-breakpoint
CREATE TABLE "codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_key" text,
	"tool_id" uuid NOT NULL,
	"code" text NOT NULL,
	"discount" text NOT NULL,
	"creator_id" uuid NOT NULL,
	"creator_link" text,
	"source_url" text NOT NULL,
	"source_title" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text,
	"votes_up" integer DEFAULT 0 NOT NULL,
	"votes_down" integer DEFAULT 0 NOT NULL,
	"submission_id" uuid,
	"last_tested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "codes_import_key_unique" UNIQUE("import_key"),
	CONSTRAINT "codes_code_len" CHECK (char_length(trim("codes"."code")) between 1 and 120),
	CONSTRAINT "codes_discount_len" CHECK (char_length(trim("codes"."discount")) between 1 and 240),
	CONSTRAINT "codes_source_url_http" CHECK ("codes"."source_url" ~* '^https?://'),
	CONSTRAINT "codes_creator_link_http" CHECK ("codes"."creator_link" is null or "codes"."creator_link" ~* '^https?://'),
	CONSTRAINT "codes_status_valid" CHECK ("codes"."status" in ('pending','to_test','verified','rejected')),
	CONSTRAINT "codes_votes_positive" CHECK ("codes"."votes_up" >= 0 and "codes"."votes_down" >= 0)
);
--> statement-breakpoint
CREATE TABLE "creators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creators_slug_unique" UNIQUE("slug"),
	CONSTRAINT "creators_slug_format" CHECK ("creators"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "creators_name_len" CHECK (char_length(trim("creators"."name")) between 1 and 160)
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category_slug" text NOT NULL,
	"website" text NOT NULL,
	"description" text,
	"priority" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "tools_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tools_slug_format" CHECK ("tools"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "tools_name_len" CHECK (char_length(trim("tools"."name")) between 1 and 120),
	CONSTRAINT "tools_website_http" CHECK ("tools"."website" ~* '^https?://'),
	CONSTRAINT "tools_priority_range" CHECK ("tools"."priority" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tools" ADD CONSTRAINT "tools_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "codes_tool_idx" ON "codes" USING btree ("tool_id");--> statement-breakpoint
CREATE INDEX "codes_creator_idx" ON "codes" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "codes_status_idx" ON "codes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tools_name_lower_idx" ON "tools" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "tools_category_idx" ON "tools" USING btree ("category_slug");