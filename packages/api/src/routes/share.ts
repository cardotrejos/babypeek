import { Hono } from "hono";
import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { db, uploads } from "@babypeek/db";
import { R2Service, R2ServiceLive } from "../services/R2Service";

const app = new Hono();

/**
 * GET /api/share/:shareId
 *
 * Public endpoint to get share data for gift purchase page.
 * Returns only public info (no auth required, no PII exposed).
 *
 * Story 6.7: Gift Purchase Option (AC-1, AC-5)
 *
 * Response:
 * - shareId: string - The share ID (same as uploadId)
 * - uploadId: string - The upload ID for checkout
 * - previewUrl: string - Signed URL for watermarked preview image
 */
app.get("/:shareId", async (c) => {
  const shareId = c.req.param("shareId");

  if (!shareId) {
    return c.json({ error: "Share ID required" }, 400);
  }

  // shareId is the uploadId
  const upload = await db.query.uploads.findFirst({
    where: eq(uploads.id, shareId),
  });

  if (!upload) {
    return c.json({ error: "Not found" }, 404);
  }

  // Must have completed processing with preview
  if (upload.status !== "completed" || !upload.previewUrl) {
    return c.json({ error: "Not available for sharing" }, 404);
  }

  // Generate signed URL for preview image
  const program = Effect.gen(function* () {
    const r2Service = yield* R2Service;

    // Generate 24-hour signed URL for the preview (public share pages)
    const signedUrl = yield* r2Service
      .getDownloadUrl(upload.previewUrl!, 24 * 60 * 60) // 24 hours
      .pipe(Effect.catchAll(() => Effect.succeed(null as string | null)));

    return signedUrl;
  });

  const signedPreviewUrl = await Effect.runPromise(program.pipe(Effect.provide(R2ServiceLive)));

  if (!signedPreviewUrl) {
    return c.json({ error: "Preview not available" }, 404);
  }

  // Return only public info - NO PII (email, sessionToken, resultUrl)
  return c.json({
    shareId,
    uploadId: upload.id,
    previewUrl: signedPreviewUrl,
  });
});

export default app;
