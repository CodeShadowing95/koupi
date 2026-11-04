CREATE TABLE "category_families" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_families_name_unique" UNIQUE("name"),
	CONSTRAINT "category_families_slug_format" CHECK ("category_families"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "category_families_name_len" CHECK (char_length(trim("category_families"."name")) between 1 and 80)
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "family_slug" text;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_family_slug_category_families_slug_fk" FOREIGN KEY ("family_slug") REFERENCES "public"."category_families"("slug") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
INSERT INTO "category_families" ("slug", "name", "position") VALUES
	('securite', 'Sécurité et vie privée', 1),
	('hebergement', 'Hébergement, domaines et cloud', 2),
	('sites', 'Sites web et boutiques', 3),
	('design', 'Design et image', 4),
	('video', 'Vidéo', 5),
	('audio', 'Audio, musique et podcast', 6),
	('createurs', 'Outils pour créateurs', 7),
	('marketing', 'Marketing et acquisition', 8),
	('productivite', 'Productivité et organisation', 9),
	('ecriture', 'Écriture et langue', 10),
	('ia', 'Assistants IA', 11),
	('argent', 'Argent et indépendants', 12),
	('formation', 'Formation et apprentissage', 13),
	('developpement', 'Développement', 14)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Range les 12 catégories d'origine dans la famille la plus proche, en attendant le reclassement.
UPDATE "categories" SET "family_slug" = CASE "slug"
	WHEN 'hebergement-web' THEN 'hebergement'
	WHEN 'noms-de-domaine' THEN 'hebergement'
	WHEN 'vpn-et-securite' THEN 'securite'
	WHEN 'ia' THEN 'ia'
	WHEN 'productivite' THEN 'productivite'
	WHEN 'formation' THEN 'formation'
	WHEN 'e-commerce-et-site' THEN 'sites'
	WHEN 'creation-et-design' THEN 'design'
	WHEN 'outils-createurs' THEN 'createurs'
	WHEN 'marketing-et-e-mail' THEN 'marketing'
	WHEN 'finance-et-freelance' THEN 'argent'
	WHEN 'developpement' THEN 'developpement'
END
WHERE "family_slug" IS NULL;
