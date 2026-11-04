CREATE TABLE "api_usage" (
	"service" text NOT NULL,
	"day" date NOT NULL,
	"units" integer DEFAULT 0 NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_usage_service_day_pk" PRIMARY KEY("service","day"),
	CONSTRAINT "api_usage_service_format" CHECK ("api_usage"."service" ~ '^[a-z0-9_]{1,30}$'),
	CONSTRAINT "api_usage_counts_positive" CHECK ("api_usage"."units" >= 0 and "api_usage"."calls" >= 0)
);
