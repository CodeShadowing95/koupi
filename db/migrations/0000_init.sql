CREATE TABLE "moderation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid,
	"action" text NOT NULL,
	"previous_status" text,
	"next_status" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_logs_action_valid" CHECK ("moderation_logs"."action" in ('approve','reject','mark_duplicate','restore'))
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_name" text NOT NULL,
	"creator_name" text NOT NULL,
	"category" text,
	"code" text NOT NULL,
	"discount_label" text NOT NULL,
	"source_url" text NOT NULL,
	"creator_link" text,
	"comment" text,
	"submitter_email" text,
	"ip_hash" text NOT NULL,
	"fingerprint" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"created_code_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "submissions_tool_name_len" CHECK (char_length(trim("submissions"."tool_name")) between 1 and 120),
	CONSTRAINT "submissions_creator_name_len" CHECK (char_length(trim("submissions"."creator_name")) between 1 and 160),
	CONSTRAINT "submissions_code_len" CHECK (char_length(trim("submissions"."code")) between 1 and 120),
	CONSTRAINT "submissions_discount_label_len" CHECK (char_length(trim("submissions"."discount_label")) between 1 and 240),
	CONSTRAINT "submissions_source_url_http" CHECK ("submissions"."source_url" ~* '^https?://'),
	CONSTRAINT "submissions_status_valid" CHECK ("submissions"."status" in ('new','approved','rejected','duplicate'))
);
--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_logs_created_idx" ON "moderation_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "submissions_status_created_idx" ON "submissions" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "submissions_fingerprint_idx" ON "submissions" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "submissions_category_idx" ON "submissions" USING btree ("category");