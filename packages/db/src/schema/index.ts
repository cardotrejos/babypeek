import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// Upload status enum values
export const uploadStatusValues = ["pending", "processing", "completed", "failed"] as const;
export type UploadStatus = (typeof uploadStatusValues)[number];

// Upload stage enum values (for progress tracking)
export const uploadStageValues = [
  "validating",
  "generating",
  "first_ready",
  "storing",
  "watermarking",
  "complete",
  "failed",
] as const;
export type UploadStage = (typeof uploadStageValues)[number];

// Prompt version enum values (for tracking which prompt was used)
export const promptVersionValues = ["v3", "v3-json", "v4", "v4-json"] as const;
export type PromptVersion = (typeof promptVersionValues)[number];

// Purchase status enum values
export const purchaseStatusValues = ["pending", "completed", "failed", "refunded"] as const;
export type PurchaseStatus = (typeof purchaseStatusValues)[number];

/**
 * Uploads table - tracks ultrasound uploads and AI processing
 */
export const uploads = pgTable("uploads", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // User identification (no auth, just email + session)
  email: text("email").notNull(),
  sessionToken: text("session_token").notNull().unique(),

  // Image URLs (R2 signed URLs)
  originalUrl: text("original_url").notNull(),
  resultUrl: text("result_url"),
  previewUrl: text("preview_url"),

  // Processing status
  status: text("status", { enum: uploadStatusValues }).default("pending").notNull(),
  stage: text("stage", { enum: uploadStageValues }), // Processing stage for progress UI
  progress: integer("progress").default(0), // Progress percentage 0-100
  workflowRunId: text("workflow_run_id"), // useworkflow.dev run ID
  promptVersion: text("prompt_version", { enum: promptVersionValues }), // Which prompt version was used
  errorMessage: text("error_message"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // For auto-deletion (30 days)
});

/**
 * Purchases table - tracks Stripe payments
 */
export const purchases = pgTable("purchases", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // Link to upload
  uploadId: text("upload_id")
    .notNull()
    .references(() => uploads.id),

  // Stripe data
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),

  // Payment details
  amount: integer("amount").notNull(), // cents
  currency: text("currency").default("usd").notNull(),
  status: text("status", { enum: purchaseStatusValues }).default("pending").notNull(),

  // Gift purchase support
  isGift: boolean("is_gift").default(false).notNull(),
  giftRecipientEmail: text("gift_recipient_email"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Results table - stores multiple AI-generated images per upload
 * Each upload can have up to 4 results from different prompt versions
 */
export const results = pgTable("results", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // Link to upload
  uploadId: text("upload_id")
    .notNull()
    .references(() => uploads.id),

  // Result details
  resultUrl: text("result_url").notNull(), // R2 key for full resolution
  previewUrl: text("preview_url"), // R2 key for watermarked preview
  promptVersion: text("prompt_version", { enum: promptVersionValues }).notNull(),

  // Generation order (1-4)
  variantIndex: integer("variant_index").notNull(),

  // Metadata
  fileSizeBytes: integer("file_size_bytes"),
  generationTimeMs: integer("generation_time_ms"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Downloads table - tracks HD image downloads (for analytics & re-download support)
 */
export const downloads = pgTable("downloads", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // Link to purchase
  purchaseId: text("purchase_id")
    .notNull()
    .references(() => purchases.id),

  // Download metadata
  downloadedAt: timestamp("downloaded_at").defaultNow().notNull(),
  ipHash: text("ip_hash"), // Hashed for privacy, used for abuse detection
});

// Preference reason enum values (for tracking why users prefer certain results)
export const preferenceReasonValues = [
  "more_realistic",
  "better_lighting",
  "cuter_expression",
  "clearer_details",
  "better_colors",
  "more_natural",
  "other",
] as const;
export type PreferenceReason = (typeof preferenceReasonValues)[number];

/**
 * Preferences table - tracks which result variants users prefer and why
 * Used for A/B testing prompts and improving generation quality
 */
export const preferences = pgTable("preferences", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  // Link to upload and selected result
  uploadId: text("upload_id")
    .notNull()
    .references(() => uploads.id),
  selectedResultId: text("selected_result_id")
    .notNull()
    .references(() => results.id),

  // Which prompt version was selected
  selectedPromptVersion: text("selected_prompt_version", { enum: promptVersionValues }).notNull(),

  // Why they preferred it (optional quick feedback)
  reason: text("reason", { enum: preferenceReasonValues }),

  // All variants that were shown (for context)
  shownVariants: text("shown_variants").notNull(), // JSON array of prompt versions shown

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports for use in application code
export type Upload = typeof uploads.$inferSelect;
export type NewUpload = typeof uploads.$inferInsert;
export type Result = typeof results.$inferSelect;
export type NewResult = typeof results.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type Download = typeof downloads.$inferSelect;
export type NewDownload = typeof downloads.$inferInsert;
export type Preference = typeof preferences.$inferSelect;
export type NewPreference = typeof preferences.$inferInsert;
