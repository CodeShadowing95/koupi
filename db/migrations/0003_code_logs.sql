CREATE TABLE "code_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_status" text,
	"next_status" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "code_logs_action_valid" CHECK ("code_logs"."action" in ('create','edit','verify','reject','to_test','pending','archive','restore'))
);
--> statement-breakpoint
ALTER TABLE "code_logs" ADD CONSTRAINT "code_logs_code_id_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "code_logs_code_idx" ON "code_logs" USING btree ("code_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "code_logs_created_idx" ON "code_logs" USING btree ("created_at" DESC NULLS LAST);