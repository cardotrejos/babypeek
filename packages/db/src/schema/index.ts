import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// Upload status enum values
export const uploadStatusValues = ["pending", "processing", "completed", "failed"] as const
export type UploadStatus = typeof uploadStatusValues[number]

// Purchase status enum values  
export const purchaseStatusValues = ["pending", "completed", "failed", "refunded"] as const
export type PurchaseStatus = typeof purchaseStatusValues[number]

/**
 * Uploads table - tracks ultrasound uploads and AI processing
 */
export const uploads = pgTable("uploads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  
  // User identification (no auth, just email + session)
  email: text("email").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  
  // Image URLs (R2 signed URLs)
  originalUrl: text("original_url").notNull(),
  resultUrl: text("result_url"),
  previewUrl: text("preview_url"),
  
  // Processing status
  status: text("status", { enum: uploadStatusValues }).default("pending").notNull(),
  workflowRunId: text("workflow_run_id"), // useworkflow.dev run ID
  errorMessage: text("error_message"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // For auto-deletion (30 days)
})

/**
 * Purchases table - tracks Stripe payments
 */
export const purchases = pgTable("purchases", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  
  // Link to upload
  uploadId: text("upload_id").notNull().references(() => uploads.id),
  
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
})

/**
 * Downloads table - tracks HD image downloads (for analytics & re-download support)
 */
export const downloads = pgTable("downloads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  
  // Link to purchase
  purchaseId: text("purchase_id").notNull().references(() => purchases.id),
  
  // Download metadata
  downloadedAt: timestamp("downloaded_at").defaultNow().notNull(),
  ipHash: text("ip_hash"), // Hashed for privacy, used for abuse detection
})

// Type exports for use in application code
export type Upload = typeof uploads.$inferSelect
export type NewUpload = typeof uploads.$inferInsert
export type Purchase = typeof purchases.$inferSelect
export type NewPurchase = typeof purchases.$inferInsert
export type Download = typeof downloads.$inferSelect
export type NewDownload = typeof downloads.$inferInsert
