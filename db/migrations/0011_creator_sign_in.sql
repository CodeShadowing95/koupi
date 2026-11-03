CREATE TABLE "creator_sign_in_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"creator_slug" text,
	"ip_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_sign_in_tokens_hash_len" CHECK (char_length("creator_sign_in_tokens"."token_hash") = 64)
);
--> statement-breakpoint
CREATE TABLE "creator_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"creator_id" uuid,
	"access_granted_at" timestamp with time zone,
	"last_sign_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_users_email_format" CHECK ("creator_users"."email" = lower("creator_users"."email") and char_length("creator_users"."email") between 3 and 320 and position('@' in "creator_users"."email") > 1)
);
--> statement-breakpoint
ALTER TABLE "creator_users" ADD CONSTRAINT "creator_users_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_sign_in_tokens_hash_idx" ON "creator_sign_in_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "creator_sign_in_tokens_email_idx" ON "creator_sign_in_tokens" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_users_email_idx" ON "creator_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "creator_users_creator_idx" ON "creator_users" USING btree ("creator_id");