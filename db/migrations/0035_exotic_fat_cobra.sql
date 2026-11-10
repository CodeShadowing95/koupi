CREATE TABLE "removed_creators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"channel_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"import_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"removed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "removed_creators_slug_unique" UNIQUE("slug"),
	CONSTRAINT "removed_creators_name_len" CHECK (char_length(trim("removed_creators"."name")) between 1 and 160)
);
