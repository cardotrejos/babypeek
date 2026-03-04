CREATE TABLE "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "image" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint

CREATE TABLE "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL,
  CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint

CREATE TABLE "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp NOT NULL
);
--> statement-breakpoint

CREATE TABLE "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX "session_userId_idx" ON "session" ("user_id");
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");
--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");
--> statement-breakpoint

ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "uploads" ADD COLUMN "user_id" text;
--> statement-breakpoint

INSERT INTO "user" ("id", "name", "email", "email_verified", "created_at", "updated_at")
SELECT
  CONCAT('usr_', SUBSTRING(md5(email), 1, 24)) AS id,
  SPLIT_PART(email, '@', 1) AS name,
  email,
  false,
  now(),
  now()
FROM "uploads"
ON CONFLICT ("email") DO NOTHING;
--> statement-breakpoint

-- Safety: remove orphaned uploads without a valid email (can't be linked to a user).
-- Without this, the NOT NULL constraint below fails if any upload has NULL/empty email.
DELETE FROM "uploads" WHERE "email" IS NULL OR "email" = '';

UPDATE "uploads" AS u
SET "user_id" = usr."id"
FROM "user" AS usr
WHERE usr."email" = u."email";
--> statement-breakpoint

ALTER TABLE "uploads" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "uploads_user_id_idx" ON "uploads" ("user_id");
--> statement-breakpoint
ALTER TABLE "uploads" DROP COLUMN "session_token";
