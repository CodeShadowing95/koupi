CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_audit_log_action_len" CHECK (char_length("admin_audit_log"."action") between 1 and 60),
	CONSTRAINT "admin_audit_log_target_len" CHECK (char_length("admin_audit_log"."target") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_key_format" CHECK ("site_settings"."key" ~ '^(maintenance|page:[a-z-]{2,40})$')
);
--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_idx" ON "admin_audit_log" USING btree ("created_at");