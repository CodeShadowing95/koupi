ALTER TABLE "tool_suggestions" DROP CONSTRAINT "tool_suggestions_code_len";--> statement-breakpoint
DROP INDEX "tool_suggestions_tool_code_idx";--> statement-breakpoint
ALTER TABLE "tool_suggestions" ALTER COLUMN "code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tool_suggestions" ADD COLUMN "link" text;--> statement-breakpoint
CREATE UNIQUE INDEX "tool_suggestions_tool_code_idx" ON "tool_suggestions" USING btree (lower(coalesce("domain", "name")),lower(coalesce("code", "link")));--> statement-breakpoint
ALTER TABLE "tool_suggestions" ADD CONSTRAINT "tool_suggestions_code_or_link" CHECK ("tool_suggestions"."code" is not null or "tool_suggestions"."link" is not null);--> statement-breakpoint
ALTER TABLE "tool_suggestions" ADD CONSTRAINT "tool_suggestions_link_http" CHECK ("tool_suggestions"."link" is null or "tool_suggestions"."link" ~* '^https?://');--> statement-breakpoint
ALTER TABLE "tool_suggestions" ADD CONSTRAINT "tool_suggestions_code_len" CHECK ("tool_suggestions"."code" is null or char_length(trim("tool_suggestions"."code")) between 1 and 120);