ALTER TABLE "tool_suggestions" ADD COLUMN "analysis" jsonb;--> statement-breakpoint
ALTER TABLE "tool_suggestions" ADD COLUMN "analysis_cost_usd_micros" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tool_suggestions" ADD COLUMN "analyzed_at" timestamp with time zone;