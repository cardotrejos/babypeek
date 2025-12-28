import { Hono } from "hono";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { db, uploads, results } from "@babypeek/db";
import { R2Service, R2ServiceLive } from "../services/R2Service";
import { PurchaseService, PurchaseServiceLive } from "../services/PurchaseService";
import { StripeServiceLive } from "../services/StripeService";

const app = new Hono();

/**
 * GET /api/preview/:uploadId
 *
 * Public endpoint to get preview data for email links.
 * Returns watermarked previews for all 4 variants (no auth required).
 * Users can view their portraits and purchase HD versions.
 *
 * This endpoint is used for email links where the user may not have
 * the session token in localStorage (different device/browser).
 *
 * Response:
 * - uploadId: string - The upload ID
 * - status: string - Upload status (completed, processing, failed)
 * - originalUrl: string | null - Signed URL for original ultrasound
 * - results: Array of variant previews with watermarked URLs
 * - hasPurchased: boolean - Whether user has already purchased
 */
app.get("/:uploadId", async (c) => {
  const uploadId = c.req.param("uploadId");

  if (!uploadId) {
    return c.json({ error: "Upload ID required" }, 400);
  }

  const program = Effect.gen(function* () {
    const r2Service = yield* R2Service;
    const purchaseService = yield* PurchaseService;

    // Get upload
    const upload = yield* Effect.promise(() =>
      db.query.uploads.findFirst({
        where: eq(uploads.id, uploadId),
      }),
    );

    if (!upload) {
      return { error: "not_found" as const };
    }

    // Must have completed processing
    if (upload.status !== "completed") {
      return {
        error: "not_ready" as const,
        status: upload.status,
        stage: upload.stage,
        progress: upload.progress ?? 0,
      };
    }

    // Check if user has already purchased
    const purchase = yield* purchaseService.getByUploadId(uploadId).pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );
    const hasPurchased = purchase?.status === "completed";

    // Fetch all results from the results table
    const resultRows = yield* Effect.promise(() =>
      db.query.results.findMany({
        where: eq(results.uploadId, uploadId),
        orderBy: (results, { asc }) => [asc(results.variantIndex)],
      }),
    );

    // Generate signed URLs for all results
    interface ResultVariant {
      resultId: string;
      previewUrl: string | null;
      resultUrl: string | null; // Only for paid users
      promptVersion: string;
      variantIndex: number;
    }
    const allResults: ResultVariant[] = [];

    for (const result of resultRows) {
      // Always generate preview URL (watermarked)
      let previewUrl: string | null = null;
      let hdUrl: string | null = null;

      if (result.previewUrl) {
        previewUrl = yield* r2Service
          .getDownloadUrl(result.previewUrl, 60 * 60) // 1 hour
          .pipe(Effect.catchAll(() => Effect.succeed(null as string | null)));
      }

      // Only include HD URL if user has purchased
      if (hasPurchased && result.resultUrl) {
        hdUrl = yield* r2Service
          .getDownloadUrl(result.resultUrl, 60 * 60)
          .pipe(Effect.catchAll(() => Effect.succeed(null as string | null)));
      }

      // Fallback: if no preview exists, use HD URL as preview (backward compat)
      if (!previewUrl && result.resultUrl) {
        previewUrl = yield* r2Service
          .getDownloadUrl(result.resultUrl, 60 * 60)
          .pipe(Effect.catchAll(() => Effect.succeed(null as string | null)));
      }

      if (previewUrl) {
        allResults.push({
          resultId: result.id,
          previewUrl,
          resultUrl: hdUrl,
          promptVersion: result.promptVersion,
          variantIndex: result.variantIndex,
        });
      }
    }

    // Generate signed URL for original image (for comparison slider)
    let originalUrl: string | null = null;
    if (upload.originalUrl) {
      originalUrl = yield* r2Service
        .getDownloadUrl(upload.originalUrl, 60 * 60)
        .pipe(Effect.catchAll(() => Effect.succeed(null as string | null)));
    }

    return {
      success: true as const,
      uploadId,
      status: upload.status,
      originalUrl,
      results: allResults,
      hasPurchased,
    };
  });

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(R2ServiceLive),
      Effect.provide(PurchaseServiceLive),
      Effect.provide(StripeServiceLive),
    ),
  );

  if ("error" in result) {
    if (result.error === "not_found") {
      return c.json({ error: "Not found" }, 404);
    }
    if (result.error === "not_ready") {
      return c.json(
        {
          error: "Portrait not ready yet",
          status: result.status,
          stage: result.stage,
          progress: result.progress,
        },
        202,
      );
    }
  }

  return c.json(result);
});

export default app;
