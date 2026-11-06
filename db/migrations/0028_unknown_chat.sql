CREATE TABLE "web_vitals" (
	"day" date NOT NULL,
	"page" text NOT NULL,
	"metric" text NOT NULL,
	"device" text NOT NULL,
	"rating" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "web_vitals_day_page_metric_device_rating_pk" PRIMARY KEY("day","page","metric","device","rating"),
	CONSTRAINT "web_vitals_page_valid" CHECK ("web_vitals"."page" in ('home','codes','tool','creator','creators','category','other')),
	CONSTRAINT "web_vitals_metric_valid" CHECK ("web_vitals"."metric" in ('LCP','INP','CLS','FCP','TTFB')),
	CONSTRAINT "web_vitals_device_valid" CHECK ("web_vitals"."device" in ('mobile','desktop')),
	CONSTRAINT "web_vitals_rating_valid" CHECK ("web_vitals"."rating" in ('good','needs-improvement','poor'))
);
