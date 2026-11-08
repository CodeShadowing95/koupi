CREATE TABLE "creator_claim_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"code" text NOT NULL,
	"checked_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_claim_codes_code_format" CHECK ("creator_claim_codes"."code" ~ '^MERKOD-[A-Z0-9]{6}$')
);
--> statement-breakpoint
ALTER TABLE "creator_claim_codes" ADD CONSTRAINT "creator_claim_codes_user_id_creator_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."creator_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_claim_codes" ADD CONSTRAINT "creator_claim_codes_account_id_creator_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."creator_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_claim_codes_user_account_idx" ON "creator_claim_codes" USING btree ("user_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_claim_codes_code_idx" ON "creator_claim_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "creator_claim_codes_account_idx" ON "creator_claim_codes" USING btree ("account_id");