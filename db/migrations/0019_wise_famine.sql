CREATE TABLE "stored_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid,
	"tool_id" uuid,
	"mime" text NOT NULL,
	"data" text NOT NULL,
	"bytes" integer NOT NULL,
	"source_url" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stored_images_one_owner" CHECK (("stored_images"."creator_id" is null) <> ("stored_images"."tool_id" is null)),
	CONSTRAINT "stored_images_bytes" CHECK ("stored_images"."bytes" between 1 and 153600)
);
--> statement-breakpoint
ALTER TABLE "stored_images" ADD CONSTRAINT "stored_images_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_images" ADD CONSTRAINT "stored_images_tool_id_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stored_images_creator_unique" ON "stored_images" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stored_images_tool_unique" ON "stored_images" USING btree ("tool_id");