CREATE TABLE "verification_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_id" uuid,
	"submission_id" uuid,
	"score" integer NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" text,
	"extracted" jsonb,
	"model" text,
	"cost_usd_micros" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_checks_target" CHECK ("verification_checks"."code_id" is not null or "verification_checks"."submission_id" is not null),
	CONSTRAINT "verification_checks_score_range" CHECK ("verification_checks"."score" between 0 and 100),
	CONSTRAINT "verification_checks_cost_positive" CHECK ("verification_checks"."cost_usd_micros" >= 0)
);
--> statement-breakpoint
CREATE TABLE "watched_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"external_id" text NOT NULL,
	"feed_url" text,
	"title" text NOT NULL,
	"creator_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watched_sources_platform_valid" CHECK ("watched_sources"."platform" in ('youtube','podcast')),
	CONSTRAINT "watched_sources_external_id_len" CHECK (char_length(trim("watched_sources"."external_id")) between 1 and 200),
	CONSTRAINT "watched_sources_title_len" CHECK (char_length(trim("watched_sources"."title")) between 1 and 200),
	CONSTRAINT "watched_sources_feed_url_http" CHECK ("watched_sources"."feed_url" is null or "watched_sources"."feed_url" ~* '^https?://')
);
--> statement-breakpoint
ALTER TABLE "code_logs" DROP CONSTRAINT "code_logs_action_valid";--> statement-breakpoint
ALTER TABLE "codes" ADD COLUMN "payment_tested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_code_id_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_checks" ADD CONSTRAINT "verification_checks_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watched_sources" ADD CONSTRAINT "watched_sources_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_checks_code_idx" ON "verification_checks" USING btree ("code_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "verification_checks_submission_idx" ON "verification_checks" USING btree ("submission_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "verification_checks_created_idx" ON "verification_checks" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "watched_sources_platform_external_idx" ON "watched_sources" USING btree ("platform","external_id");--> statement-breakpoint
CREATE INDEX "watched_sources_active_idx" ON "watched_sources" USING btree ("active");--> statement-breakpoint
ALTER TABLE "code_logs" ADD CONSTRAINT "code_logs_action_valid" CHECK ("code_logs"."action" in ('create','edit','verify','reject','to_test','pending','archive','restore','payment_test'));