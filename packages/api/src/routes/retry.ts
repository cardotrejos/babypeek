import { Hono } from "hono"
import { Effect } from "effect"

import { UploadService } from "../services/UploadService"
import { PostHogService } from "../services/PostHogService"
import { AppServicesLive } from "../services"
import { UploadStatusError, ValidationError } from "../lib/errors"
import { rateLimitMiddleware } from "../middleware/rate-limit"

const app = new Hono()

// =============================================================================
// Rate Limiting Middleware
// =============================================================================

// Apply rate limiting to prevent abuse of retry endpoint
app.use("*", rateLimitMiddleware())

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/retry/:jobId
 *
 * Retry a failed processing job.
 * Resets the upload state and triggers a new processing attempt.
 *
 * Headers:
 * - X-Session-Token: string - Required session token for authentication
 *
 * Response:
 * - success: boolean
 * - jobId: string - The job ID (same as input)
 * - status: "pending" - Ready for reprocessing
 * - message: string - User-friendly message
 */
app.post("/:jobId", async (c) => {
  const jobId = c.req.param("jobId")
  const sessionToken = c.req.header("X-Session-Token")

  if (!sessionToken) {
    return c.json(
      {
        error: "Session token is required",
        code: "MISSING_TOKEN",
      },
      401
    )
  }

  if (!jobId) {
    return c.json(
      {
        error: "Job ID is required",
        code: "MISSING_JOB_ID",
      },
      400
    )
  }

  const retryJob = Effect.gen(function* () {
    const uploadService = yield* UploadService
    const posthog = yield* PostHogService

    // Get upload and verify session token ownership
    const upload = yield* uploadService.getByIdWithAuth(jobId, sessionToken)

    // Only allow retry for failed jobs (AC-3)
    if (upload.status !== "failed") {
      return yield* Effect.fail(
        new ValidationError({
          field: "status",
          message: `Can only retry failed jobs. Current status: ${upload.status}`,
        })
      )
    }

    // Store previous error for analytics
    const previousError = upload.errorMessage

    // Reset upload state for retry
    const resetUpload = yield* uploadService.resetForRetry(jobId)

    // Track retry analytics
    yield* posthog.capture("processing_retry", sessionToken, {
      upload_id: jobId,
      previous_error: previousError,
      previous_stage: upload.stage,
      previous_progress: upload.progress,
    })

    return {
      success: true,
      jobId,
      status: resetUpload.status,
      message: "Ready to try again! Start processing to continue.",
    }
  })

  const program = retryJob.pipe(Effect.provide(AppServicesLive))

  const result = await Effect.runPromise(Effect.either(program))

  if (result._tag === "Left") {
    const error = result.left

    // Handle specific error types
    // Use _tag for Effect error type checking
    const errorTag = (error as { _tag?: string })._tag

    if (errorTag === "NotFoundError") {
      return c.json(
        {
          error: "Job not found or session mismatch",
          code: "NOT_FOUND",
        },
        404
      )
    }

    if (errorTag === "ValidationError") {
      const validationError = error as ValidationError
      return c.json(
        {
          error: validationError.message,
          code: "INVALID_STATUS",
          field: validationError.field,
        },
        400
      )
    }

    if (errorTag === "UploadStatusError") {
      const statusError = error as UploadStatusError
      return c.json(
        {
          error: statusError.message,
          code: "INVALID_TRANSITION",
        },
        400
      )
    }

    // Generic error
    console.error("[retry] Error retrying job:", error)
    return c.json(
      {
        error: "Failed to retry job",
        code: "RETRY_ERROR",
        message: String(error),
      },
      500
    )
  }

  // Success
  return c.json(result.right)
})

export default app
