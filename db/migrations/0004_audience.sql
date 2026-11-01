CREATE TABLE "daily_counters" (
	"day" date NOT NULL,
	"metric" text NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_counters_day_metric_key_pk" PRIMARY KEY("day","metric","key"),
	CONSTRAINT "daily_counters_metric_valid" CHECK ("daily_counters"."metric" in ('copy','open','search_empty')),
	CONSTRAINT "daily_counters_key_len" CHECK (char_length("daily_counters"."key") between 1 and 80)
);
--> statement-breakpoint
CREATE INDEX "daily_counters_metric_day_idx" ON "daily_counters" USING btree ("metric","day");