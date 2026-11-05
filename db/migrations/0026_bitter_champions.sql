CREATE TABLE "source_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"trigger" text NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"items" integer DEFAULT 0 NOT NULL,
	"codes" integer DEFAULT 0 NOT NULL,
	"suggested" integer DEFAULT 0 NOT NULL,
	"units" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_runs_source_valid" CHECK ("source_runs"."source" in ('youtube_search','youtube_channel','podcast')),
	CONSTRAINT "source_runs_trigger_valid" CHECK ("source_runs"."trigger" in ('manual','cron')),
	CONSTRAINT "source_runs_status_valid" CHECK ("source_runs"."status" in ('ok','partial','failed')),
	CONSTRAINT "source_runs_counts_positive" CHECK ("source_runs"."items" >= 0 and "source_runs"."codes" >= 0 and "source_runs"."suggested" >= 0 and "source_runs"."units" >= 0),
	CONSTRAINT "source_runs_scope_len" CHECK (char_length("source_runs"."scope") <= 200)
);
--> statement-breakpoint
CREATE INDEX "source_runs_source_idx" ON "source_runs" USING btree ("source","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "source_runs_started_idx" ON "source_runs" USING btree ("started_at" DESC NULLS LAST);