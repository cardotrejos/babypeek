import { Hono } from "hono"
import { Effect } from "effect"

import { UploadService, UploadServiceLive } from "../services/UploadService"

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

    // Get upload with session token verification
    const upload = yield* uploadService.getByIdWithAuth(jobId, sessionToken)

    // Determine resultId - only include if status is completed and we have a result URL
    let resultId: string | null = null
    if (upload.status === "completed" && upload.resultUrl) {
      // Extract resultId from resultUrl path: results/{resultId}/full.jpg
      const match = upload.resultUrl.match(/results\/([^/]+)\//)
      resultId = match?.[1] ?? upload.id
    }

    return {
      success: true,
      status: upload.status,
      stage: upload.stage,
      progress: upload.progress ?? 0,
      resultId,
      errorMessage: upload.status === "failed" ? (upload.errorMessage ?? "Processing failed. Please try again.") : null,
      updatedAt: upload.updatedAt.toISOString(),
    }
  })

  const program = getStatus.pipe(Effect.provide(UploadServiceLive))
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
