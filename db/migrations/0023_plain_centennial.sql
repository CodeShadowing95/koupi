ALTER TABLE "creator_accounts" ADD COLUMN "metrics" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_accounts" ADD COLUMN "metrics_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "creator_accounts" ADD CONSTRAINT "creator_accounts_metrics_object" CHECK (jsonb_typeof("creator_accounts"."metrics") = 'object');