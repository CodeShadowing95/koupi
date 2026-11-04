CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"email" text,
	"from_path" text,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone,
	CONSTRAINT "feedback_kind_valid" CHECK ("feedback"."kind" in ('remark','idea','problem')),
	CONSTRAINT "feedback_status_valid" CHECK ("feedback"."status" in ('new','read','done')),
	CONSTRAINT "feedback_message_len" CHECK (char_length("feedback"."message") between 1 and 2000),
	CONSTRAINT "feedback_email_len" CHECK ("feedback"."email" is null or char_length("feedback"."email") between 3 and 320),
	CONSTRAINT "feedback_from_path" CHECK ("feedback"."from_path" is null or ("feedback"."from_path" ~ '^/' and char_length("feedback"."from_path") <= 300))
);
--> statement-breakpoint
CREATE INDEX "feedback_status_created_idx" ON "feedback" USING btree ("status","created_at" DESC NULLS LAST);