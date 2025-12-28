CREATE TABLE "preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"upload_id" text NOT NULL,
	"selected_result_id" text NOT NULL,
	"selected_prompt_version" text NOT NULL,
	"reason" text,
	"shown_variants" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_selected_result_id_results_id_fk" FOREIGN KEY ("selected_result_id") REFERENCES "public"."results"("id") ON DELETE no action ON UPDATE no action;