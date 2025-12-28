CREATE TABLE "results" (
	"id" text PRIMARY KEY NOT NULL,
	"upload_id" text NOT NULL,
	"result_url" text NOT NULL,
	"preview_url" text,
	"prompt_version" text NOT NULL,
	"variant_index" integer NOT NULL,
	"file_size_bytes" integer,
	"generation_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;