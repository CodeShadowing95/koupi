CREATE TABLE "creator_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"email" text,
	"account_url" text,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"handled_at" timestamp with time zone,
	CONSTRAINT "creator_requests_kind_valid" CHECK ("creator_requests"."kind" in ('claim','report')),
	CONSTRAINT "creator_requests_status_valid" CHECK ("creator_requests"."status" in ('new','done','dismissed')),
	CONSTRAINT "creator_requests_claim_contact" CHECK ("creator_requests"."kind" <> 'claim' or ("creator_requests"."email" is not null and "creator_requests"."account_url" is not null)),
	CONSTRAINT "creator_requests_report_message" CHECK ("creator_requests"."kind" <> 'report' or "creator_requests"."message" is not null),
	CONSTRAINT "creator_requests_email_len" CHECK ("creator_requests"."email" is null or char_length("creator_requests"."email") between 3 and 320),
	CONSTRAINT "creator_requests_account_url_http" CHECK ("creator_requests"."account_url" is null or "creator_requests"."account_url" ~* '^https?://'),
	CONSTRAINT "creator_requests_message_len" CHECK ("creator_requests"."message" is null or char_length("creator_requests"."message") between 1 and 1000),
	CONSTRAINT "creator_requests_admin_note_len" CHECK ("creator_requests"."admin_note" is null or char_length("creator_requests"."admin_note") <= 500)
);
--> statement-breakpoint
ALTER TABLE "creator_requests" ADD CONSTRAINT "creator_requests_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_requests_status_created_idx" ON "creator_requests" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "creator_requests_creator_idx" ON "creator_requests" USING btree ("creator_id");