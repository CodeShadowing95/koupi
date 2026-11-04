CREATE TABLE "creator_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"external_id" text,
	"handle" text NOT NULL,
	"url" text NOT NULL,
	"subscribers" integer,
	"subscribers_at" timestamp with time zone,
	"platform_verified" boolean DEFAULT false NOT NULL,
	"admin_checked_at" timestamp with time zone,
	"claim_status" text DEFAULT 'none' NOT NULL,
	"claim_method" text,
	"claimed_at" timestamp with time zone,
	"last_rechecked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_accounts_platform_valid" CHECK ("creator_accounts"."platform" in ('youtube','tiktok','instagram','snapchat','twitch','x','podcast','other')),
	CONSTRAINT "creator_accounts_claim_status_valid" CHECK ("creator_accounts"."claim_status" in ('none','pending','verified','revoked')),
	CONSTRAINT "creator_accounts_claim_method_valid" CHECK ("creator_accounts"."claim_method" is null or "creator_accounts"."claim_method" in ('oauth','bio_code','dm','manual')),
	CONSTRAINT "creator_accounts_handle_len" CHECK (char_length(trim("creator_accounts"."handle")) between 1 and 120),
	CONSTRAINT "creator_accounts_external_id_len" CHECK ("creator_accounts"."external_id" is null or char_length(trim("creator_accounts"."external_id")) between 1 and 200),
	CONSTRAINT "creator_accounts_url_http" CHECK ("creator_accounts"."url" ~* '^https?://'),
	CONSTRAINT "creator_accounts_subscribers_positive" CHECK ("creator_accounts"."subscribers" is null or "creator_accounts"."subscribers" >= 0)
);
--> statement-breakpoint
ALTER TABLE "creator_accounts" ADD CONSTRAINT "creator_accounts_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_accounts_creator_idx" ON "creator_accounts" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_accounts_platform_external_idx" ON "creator_accounts" USING btree ("platform","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_accounts_platform_handle_idx" ON "creator_accounts" USING btree ("platform",lower("handle"));