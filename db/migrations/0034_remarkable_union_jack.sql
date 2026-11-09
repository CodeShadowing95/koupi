CREATE TABLE "universes" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "universes_name_unique" UNIQUE("name"),
	CONSTRAINT "universes_slug_format" CHECK ("universes"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "universes_name_len" CHECK (char_length(trim("universes"."name")) between 1 and 60)
);
--> statement-breakpoint
-- Univers de départ (ADR-0046). Seuls les outils en ligne sont visibles : les autres restent dans l'admin.
INSERT INTO "universes" ("slug", "name", "position", "visible") VALUES
	('outils-en-ligne', 'Outils en ligne', 1, true),
	('beaute-et-soins', 'Beauté et soins', 2, false),
	('mode', 'Mode', 3, false),
	('high-tech-et-maison', 'High-tech et maison', 4, false),
	('autres', 'Autres', 5, false)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "category_families" ADD COLUMN "universe_slug" text DEFAULT 'outils-en-ligne' NOT NULL;--> statement-breakpoint
ALTER TABLE "category_families" ADD CONSTRAINT "category_families_universe_slug_universes_slug_fk" FOREIGN KEY ("universe_slug") REFERENCES "public"."universes"("slug") ON DELETE no action ON UPDATE cascade;