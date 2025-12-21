import { Hono } from "hono"
import { Effect } from "effect"

import { UploadService, UploadServiceLive } from "../services/UploadService"
import { R2Service, R2ServiceLive } from "../services/R2Service"

const app = new Hono()

// =============================================================================
// GET /api/status/:jobId
// =============================================================================

/**
 * GET /api/status/:jobId
 * 
 * Get the current processing status of an upload/job.
 * Requires session token for authorization.
 * 
 * Path params:
 * - jobId: string - The upload/job ID to check
 * 
 * Headers:
 * - X-Session-Token: string - Session token for authorization
 * 
 * Response (processing):
 * {
 *   success: true,
 *   status: "processing",
 *   stage: "generating",
 *   progress: 45,
 *   resultId: null,
 *   updatedAt: "2024-12-21T10:30:00Z"
 * }
 * 
 * Response (complete):
 * {
 *   success: true,
 *   status: "completed",
 *   stage: "complete",
 *   progress: 100,
 *   resultId: "clx123...",
 *   updatedAt: "2024-12-21T10:31:30Z"
 * }
 * 
 * Response (failed):
 * {
 *   success: true,
 *   status: "failed",
 *   stage: "failed",
 *   progress: 30,
 *   resultId: null,
 *   errorMessage: "Processing failed. Please try again.",
 *   updatedAt: "2024-12-21T10:31:00Z"
 * }
 * 
 * Error responses:
 * - 401: Invalid or missing session token
 * - 404: Upload not found
 */
app.get("/:jobId", async (c) => {
  const jobId = c.req.param("jobId")
  const sessionToken = c.req.header("X-Session-Token")

  // Require session token
  if (!sessionToken) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Session token required" } },
      401
    )
  }

  const getStatus = Effect.gen(function* () {
    const uploadService = yield* UploadService
    const r2Service = yield* R2Service

    // Get upload with session token verification
    const upload = yield* uploadService.getByIdWithAuth(jobId, sessionToken)

    // Determine resultId and generate signed URL if completed
    let resultId: string | null = null
    let resultUrl: string | null = null
    let originalUrl: string | null = null
    let previewUrl: string | null = null
    
    if (upload.status === "completed" && upload.resultUrl) {
      // Extract resultId from resultUrl path: results/{resultId}/full.jpg
      const match = upload.resultUrl.match(/results\/([^/]+)\//)
      resultId = match?.[1] ?? upload.id
      
      // Generate signed URL for PREVIEW (watermarked) - this is what unpaid users see
      // The frontend should show preview until payment, then show full
      if (upload.previewUrl) {
        const previewSignedUrl = yield* r2Service.getDownloadUrl(upload.previewUrl, 60 * 60).pipe(
          Effect.catchAll(() => Effect.succeed(null as string | null))
        )
        previewUrl = previewSignedUrl
      }
      
      // Also generate signed URL for FULL image (used after payment)
      const fullR2Key = `results/${resultId}/full.jpg`
      const signedUrlResult = yield* r2Service.getDownloadUrl(fullR2Key, 60 * 60).pipe(
        Effect.catchAll(() => Effect.succeed(null as string | null))
      )
      resultUrl = signedUrlResult

      // Generate a signed URL for the original image (Story 5.5 - comparison slider)
      if (upload.originalUrl) {
        const originalSignedUrl = yield* r2Service.getDownloadUrl(upload.originalUrl, 60 * 60).pipe(
          Effect.catchAll(() => Effect.succeed(null as string | null))
        )
        originalUrl = originalSignedUrl
      }
    }

    return {
      success: true,
      status: upload.status,
      stage: upload.stage,
      progress: upload.progress ?? 0,
      resultId,
      resultUrl,        // Full unwatermarked image (for paid users)
      previewUrl,       // Watermarked preview (for unpaid users)
      originalUrl,
      promptVersion: upload.promptVersion ?? null,
      errorMessage: upload.status === "failed" ? (upload.errorMessage ?? "Processing failed. Please try again.") : null,
      updatedAt: upload.updatedAt.toISOString(),
    }
  })

  const program = getStatus.pipe(Effect.provide(UploadServiceLive), Effect.provide(R2ServiceLive))
  const result = await Effect.runPromise(Effect.either(program))

  if (result._tag === "Left") {
    const error = result.left

    // Handle NotFoundError (upload not found OR session token doesn't match)
    if (error._tag === "NotFoundError") {
      return c.json(
        { success: false, error: { code: "NOT_FOUND", message: "Upload not found" } },
        404
      )
    }

    // Unknown error
    console.error("[status] Unexpected error:", error)
    return c.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      500
    )
  }

  return c.json(result.right)
})

export default app
