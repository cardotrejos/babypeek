import { Effect, Context, Layer } from "effect";
import { lt, eq } from "drizzle-orm";
import { db, uploads, purchases, downloads, results, preferences } from "@babypeek/db";
import { R2Service } from "./R2Service";
import { CleanupError } from "../lib/errors";

// =============================================================================
// CleanupService Definition
// Story 8.7: Auto-Delete After 30 Days
// =============================================================================

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const GDPR_ANONYMIZED_EMAIL = "deleted@gdpr.local";

export interface CleanupResult {
  processed: number;
  deleted: number;
  failed: number;
  errors: string[];
}

export class CleanupService extends Context.Tag("CleanupService")<
  CleanupService,
  {
    /**
     * Run the cleanup process for stale uploads
     * - Deletes R2 objects for uploads older than 30 days
     * - Anonymizes purchase records (GDPR compliance)
     * - Deletes upload/purchase/download records
     */
    runCleanup: Effect.Effect<CleanupResult, CleanupError, R2Service>;
  }
>() {}

// =============================================================================
// CleanupService Implementation
// =============================================================================

/**
 * Determine if an upload should be deleted based on retention policy:
 * - Unpurchased uploads: 30 days from upload.createdAt
 * - Purchased uploads: 30 days from purchase.createdAt
 */
const shouldDeleteUpload = (
  upload: { createdAt: Date },
  purchase: { createdAt: Date } | null,
  now: Date,
): boolean => {
  const baseDate = purchase?.createdAt ?? upload.createdAt;
  const expiryDate = new Date(baseDate.getTime() + THIRTY_DAYS_MS);
  return now > expiryDate;
};

/**
 * Clean up a single upload and its related records
 * Order: downloads -> purchases (anonymize) -> R2 objects -> upload record
 */
const cleanupSingleUpload = (
  uploadId: string,
  originalUrl: string | null,
  resultUrl: string | null,
): Effect.Effect<{ r2DeletedCount: number; errors: string[] }, CleanupError, R2Service> =>
  Effect.gen(function* () {
    const r2Service = yield* R2Service;
    const errors: string[] = [];
    let r2DeletedCount = 0;

    // 1. Delete downloads for this upload's purchase
    const uploadPurchases = yield* Effect.tryPromise({
      try: () =>
        db.select({ id: purchases.id }).from(purchases).where(eq(purchases.uploadId, uploadId)),
      catch: (e) =>
        new CleanupError({
          cause: "DB_FAILED",
          message: `Failed to query purchases: ${e}`,
          uploadId,
        }),
    });

    for (const purchase of uploadPurchases) {
      yield* Effect.tryPromise({
        try: () => db.delete(downloads).where(eq(downloads.purchaseId, purchase.id)),
        catch: (e) =>
          new CleanupError({
            cause: "DB_FAILED",
            message: `Failed to delete downloads: ${e}`,
            uploadId,
          }),
      });
    }

    // 2. Anonymize purchase email (GDPR) then keep record for analytics
    // We anonymize rather than delete to preserve purchase analytics
    yield* Effect.tryPromise({
      try: () =>
        db
          .update(purchases)
          .set({ giftRecipientEmail: GDPR_ANONYMIZED_EMAIL })
          .where(eq(purchases.uploadId, uploadId)),
      catch: (e) =>
        new CleanupError({
          cause: "DB_FAILED",
          message: `Failed to anonymize purchase: ${e}`,
          uploadId,
        }),
    });

    // 3. Delete R2 objects (uploads/{id}/ and results/{id}/ prefixes)
    // Delete original upload
    if (originalUrl) {
      // Extract prefix: "uploads/{id}/" from "uploads/{id}/original.jpg"
      const uploadPrefix = originalUrl.includes("/")
        ? originalUrl.substring(0, originalUrl.lastIndexOf("/") + 1)
        : `uploads/${uploadId}/`;

      const deleteResult = yield* Effect.either(r2Service.deletePrefix(uploadPrefix));
      if (deleteResult._tag === "Right") {
        r2DeletedCount += deleteResult.right;
      } else {
        errors.push(`R2 delete failed for ${uploadPrefix}: ${deleteResult.left.message}`);
      }
    }

    // Delete result images
    if (resultUrl) {
      // Extract prefix: "results/{id}/" from "results/{id}/full.jpg"
      const resultPrefix = resultUrl.includes("/")
        ? resultUrl.substring(0, resultUrl.lastIndexOf("/") + 1)
        : `results/${uploadId}/`;

      const deleteResult = yield* Effect.either(r2Service.deletePrefix(resultPrefix));
      if (deleteResult._tag === "Right") {
        r2DeletedCount += deleteResult.right;
      } else {
        errors.push(`R2 delete failed for ${resultPrefix}: ${deleteResult.left.message}`);
      }
    }

    // 4. Delete purchase records (after anonymization is done, we can delete for cleanup)
    yield* Effect.tryPromise({
      try: () => db.delete(purchases).where(eq(purchases.uploadId, uploadId)),
      catch: (e) =>
        new CleanupError({
          cause: "DB_FAILED",
          message: `Failed to delete purchases: ${e}`,
          uploadId,
        }),
    });

    // 5. Delete preferences for this upload (must delete before results due to FK)
    yield* Effect.tryPromise({
      try: () => db.delete(preferences).where(eq(preferences.uploadId, uploadId)),
      catch: (e) =>
        new CleanupError({
          cause: "DB_FAILED",
          message: `Failed to delete preferences: ${e}`,
          uploadId,
        }),
    });

    // 6. Delete results for this upload (must delete before uploads due to FK)
    yield* Effect.tryPromise({
      try: () => db.delete(results).where(eq(results.uploadId, uploadId)),
      catch: (e) =>
        new CleanupError({
          cause: "DB_FAILED",
          message: `Failed to delete results: ${e}`,
          uploadId,
        }),
    });

    // 7. Delete upload record
    yield* Effect.tryPromise({
      try: () => db.delete(uploads).where(eq(uploads.id, uploadId)),
      catch: (e) =>
        new CleanupError({
          cause: "DB_FAILED",
          message: `Failed to delete upload: ${e}`,
          uploadId,
        }),
    });

    return { r2DeletedCount, errors };
  }).pipe(Effect.withSpan("CleanupService.cleanupSingleUpload"));

const runCleanup: Effect.Effect<CleanupResult, CleanupError, R2Service> = Effect.gen(function* () {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

  // Get all uploads that might be stale (created more than 30 days ago)
  // We'll check each one individually against the retention policy
  const potentiallyStaleUploads = yield* Effect.tryPromise({
    try: () =>
      db
        .select({
          id: uploads.id,
          originalUrl: uploads.originalUrl,
          resultUrl: uploads.resultUrl,
          createdAt: uploads.createdAt,
        })
        .from(uploads)
        .where(lt(uploads.createdAt, thirtyDaysAgo)),
    catch: (e) =>
      new CleanupError({ cause: "DB_FAILED", message: `Failed to query stale uploads: ${e}` }),
  });

  const result: CleanupResult = {
    processed: 0,
    deleted: 0,
    failed: 0,
    errors: [],
  };

  for (const upload of potentiallyStaleUploads) {
    result.processed++;

    // Check for associated purchase
    const purchaseResult = yield* Effect.tryPromise({
      try: () =>
        db
          .select({ createdAt: purchases.createdAt })
          .from(purchases)
          .where(eq(purchases.uploadId, upload.id))
          .limit(1),
      catch: (e) =>
        new CleanupError({
          cause: "DB_FAILED",
          message: `Failed to query purchase for upload ${upload.id}: ${e}`,
          uploadId: upload.id,
        }),
    });
    const purchase = purchaseResult[0] ?? null;

    // Apply retention policy
    if (!shouldDeleteUpload(upload, purchase, now)) {
      // Purchase extends retention - skip this upload
      continue;
    }

    // Wrap cleanup in Effect.either to catch individual failures (AC-6)
    const cleanupResult = yield* Effect.either(
      cleanupSingleUpload(upload.id, upload.originalUrl, upload.resultUrl),
    );

    if (cleanupResult._tag === "Right") {
      result.deleted++;
      if (cleanupResult.right.errors.length > 0) {
        result.errors.push(...cleanupResult.right.errors);
      }
    } else {
      result.failed++;
      result.errors.push(`Upload ${upload.id}: ${cleanupResult.left.message}`);
    }
  }

  return result;
}).pipe(Effect.withSpan("CleanupService.runCleanup"));

// =============================================================================
// CleanupService Live Layer
// =============================================================================

export const CleanupServiceLive = Layer.succeed(CleanupService, {
  runCleanup,
});
