ALTER TABLE "codes" DROP CONSTRAINT "codes_code_len";--> statement-breakpoint
ALTER TABLE "codes" ALTER COLUMN "code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_code_or_link" CHECK ("codes"."code" is not null or "codes"."creator_link" is not null);--> statement-breakpoint
ALTER TABLE "codes" ADD CONSTRAINT "codes_code_len" CHECK ("codes"."code" is null or char_length(trim("codes"."code")) between 1 and 120);