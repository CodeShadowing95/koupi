ALTER TABLE "codes" ADD COLUMN "origin" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_origin_valid" CHECK ("codes"."origin" in ('manual','submission','import','youtube_search','youtube_channel','podcast','ai_web','spotify','unknown'));--> statement-breakpoint
-- Origine des codes déjà en base, d'après ce qu'on sait d'eux (ADR-0032). Ce qu'on ne peut pas deviner reste « unknown ».
UPDATE "codes" SET "origin" = 'import' WHERE "import_key" IS NOT NULL;--> statement-breakpoint
UPDATE "codes" SET "origin" = 'submission' WHERE "origin" = 'unknown' AND "submission_id" IS NOT NULL;--> statement-breakpoint
UPDATE "codes" SET "origin" = CASE WHEN s."source_url" ~* '^https?://([a-z0-9-]+\.)*(youtube\.com|youtu\.be)/' THEN 'youtube_search' ELSE 'podcast' END
  FROM "tool_suggestions" s WHERE "codes"."origin" = 'unknown' AND s."code_id" = "codes"."id";--> statement-breakpoint
UPDATE "codes" SET "origin" = 'podcast' WHERE "origin" = 'unknown' AND EXISTS (
  SELECT 1 FROM "code_logs" l WHERE l."code_id" = "codes"."id" AND l."action" = 'create' AND l."note" LIKE 'Lecture du podcast%');--> statement-breakpoint
UPDATE "codes" SET "origin" = 'youtube_search' WHERE "origin" = 'unknown' AND EXISTS (
  SELECT 1 FROM "code_logs" l WHERE l."code_id" = "codes"."id" AND l."action" = 'create' AND l."note" LIKE 'Recherche%');--> statement-breakpoint
UPDATE "codes" SET "origin" = 'manual' WHERE "origin" = 'unknown' AND EXISTS (
  SELECT 1 FROM "code_logs" l WHERE l."code_id" = "codes"."id" AND l."action" = 'create' AND l."note" IS NULL);
