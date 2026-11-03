CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"cost_usd_micros" integer DEFAULT 0 NOT NULL,
	"ref" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_cost_positive" CHECK ("ai_usage"."cost_usd_micros" >= 0),
	CONSTRAINT "ai_usage_purpose_len" CHECK (char_length("ai_usage"."purpose") between 1 and 40)
);
--> statement-breakpoint
CREATE INDEX "ai_usage_created_idx" ON "ai_usage" USING btree ("created_at" DESC NULLS LAST);