CREATE TABLE "downloads" (
	"id" text PRIMARY KEY NOT NULL,
	"purchase_id" text NOT NULL,
	"downloaded_at" timestamp DEFAULT now() NOT NULL,
	"ip_hash" text
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"upload_id" text NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_gift" boolean DEFAULT false NOT NULL,
	"gift_recipient_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"session_token" text NOT NULL,
	"original_url" text NOT NULL,
	"result_url" text,
	"preview_url" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"stage" text,
	"progress" integer DEFAULT 0,
	"workflow_run_id" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "uploads_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;