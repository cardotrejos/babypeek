import { Hono } from "hono";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { db, uploads, purchases, downloads, results, preferences } from "@babypeek/db";
import { R2Service, R2ServiceLive } from "../services/R2Service";
import { NotFoundError } from "../lib/errors";
import { addBreadcrumb, captureException } from "../middleware/sentry";
import { captureEvent } from "../services/PostHogService";

const app = new Hono();

/**
 * DELETE /api/data/:token
 * GDPR Data Deletion Endpoint
 *
 * Story 8.6: Delete My Data Button
 *
 * Deletes all user data associated with the session token:
 * - Upload record
 * - Result images from R2
 * - Purchase records (anonymized for accounting)
 * - Download records
 *
 * AC-2: Confirming calls DELETE /api/data/:token
 * AC-3: Deletion removes: upload record, result images from R2, email hash
 * AC-4: The deletion is logged for compliance audit
 */
app.delete("/:token", async (c) => {
  const token = c.req.param("token");

  if (!token) {
    return c.json({ success: false, error: "Token required" }, 400);
  }

  addBreadcrumb("GDPR deletion requested", "data", { hasToken: true });

  const program = Effect.gen(function* () {
    // Find upload by session token
    const upload = yield* Effect.promise(() =>
      db.query.uploads.findFirst({
        where: eq(uploads.sessionToken, token),
      }),
    );

    if (!upload) {
      return yield* Effect.fail(new NotFoundError({ resource: "upload", id: "token" }));
    }

    const uploadId = upload.id;

    // AC-4: Log deletion request for GDPR audit (no PII - only uploadId)
    console.log(`[GDPR] Data deletion requested for upload: ${uploadId}`);
    addBreadcrumb("GDPR deletion processing", "data", { uploadId });

    // Track deletion requested event
    captureEvent("data_deletion_requested", uploadId, {
      upload_id: uploadId,
    });

    const r2Service = yield* R2Service;

    // 1. Delete images from R2 using deletePrefix (more efficient)
    // Deletes all objects with prefix uploads/{uploadId}/ and results/{uploadId}/
    const uploadDeleteCount = yield* r2Service
      .deletePrefix(`uploads/${uploadId}/`)
      .pipe(Effect.catchAll(() => Effect.succeed(0)));
    const resultDeleteCount = yield* r2Service
      .deletePrefix(`results/${uploadId}/`)
      .pipe(Effect.catchAll(() => Effect.succeed(0)));

    console.log(
      `[GDPR] Deleted ${uploadDeleteCount + resultDeleteCount} R2 objects for upload: ${uploadId}`,
    );

    // 2. Get purchase records for this upload (need to delete downloads first)
    const purchaseRecords = yield* Effect.promise(() =>
      db.query.purchases.findMany({
        where: eq(purchases.uploadId, uploadId),
      }),
    );

    // 3. Delete download records for all purchases
    for (const purchase of purchaseRecords) {
      yield* Effect.promise(() =>
        db.delete(downloads).where(eq(downloads.purchaseId, purchase.id)),
      );
    }

    // 4. Anonymize purchase records (keep for accounting, but remove PII)
    yield* Effect.promise(() =>
      db
        .update(purchases)
        .set({
          giftRecipientEmail: null, // Clear gift recipient email
        })
        .where(eq(purchases.uploadId, uploadId)),
    );

    // 5. Delete preferences for this upload (must delete before results due to FK)
    yield* Effect.promise(() =>
      db.delete(preferences).where(eq(preferences.uploadId, uploadId)),
    );

    // 6. Delete results for this upload (must delete before uploads due to FK)
    yield* Effect.promise(() =>
      db.delete(results).where(eq(results.uploadId, uploadId)),
    );

    // 7. Delete upload record (this cascade-affects nothing now since we handled refs)
    yield* Effect.promise(() => db.delete(uploads).where(eq(uploads.id, uploadId)));

    // AC-4: Log successful deletion for audit
    console.log(`[GDPR] Data deletion completed for upload: ${uploadId}`);
    addBreadcrumb("GDPR deletion completed", "data", { uploadId });

    // Track deletion completed event
    captureEvent("data_deletion_completed", uploadId, {
      upload_id: uploadId,
      r2_objects_deleted: uploadDeleteCount + resultDeleteCount,
    });

    return { success: true, message: "Your data has been deleted" };
  });

  const resultEither = await Effect.runPromise(
    Effect.either(program.pipe(Effect.provide(R2ServiceLive))),
  );

  if (resultEither._tag === "Left") {
    const error = resultEither.left;

    if (error._tag === "NotFoundError") {
      return c.json({ success: false, error: "Data not found or already deleted" }, 404);
    }

    // Log unexpected errors to Sentry
    captureException(error instanceof Error ? error : new Error(String(error)), {
      context: "GDPR deletion",
    });

    return c.json({ success: false, error: "Failed to delete data. Please try again." }, 500);
  }

  return c.json(resultEither.right);
});

export default app;
