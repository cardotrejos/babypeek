import { Hono } from "hono"
import { Effect, Layer } from "effect"
import { z } from "zod"
import { start } from "workflow/api"

import { UploadService, UploadServiceLive } from "../services/UploadService"
import { PostHogService, PostHogServiceLive } from "../services/PostHogService"
import { UnauthorizedError, NotFoundError, AlreadyProcessingError } from "../lib/errors"
import { processImageWorkflow } from "../workflows/process-image"
import { rateLimitMiddleware } from "../middleware/rate-limit"

// Combined layer for process routes
const ProcessRoutesLive = Layer.merge(UploadServiceLive, PostHogServiceLive)

const app = new Hono()

// =============================================================================
// Rate Limiting Middleware
// =============================================================================

// Apply rate limiting to prevent DoS attacks on workflow trigger
app.use("*", rateLimitMiddleware())

// =============================================================================
// Request Schemas
// =============================================================================

const processRequestSchema = z.object({
  uploadId: z.string().min(1, "Upload ID is required"),
})

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/process
 *
 * Trigger the AI image processing workflow.
 * This endpoint implements the fire-and-forget pattern:
 * 1. Validates the session token
 * 2. Verifies the upload exists and is in "pending" status
 * 3. Triggers the Workflow DevKit workflow asynchronously
 * 4. Updates upload status to "processing" with workflowRunId
 * 5. Returns immediately (< 2s)
 *
 * Headers:
 * - X-Session-Token: string - Required session token for authentication
 *
 * Request body:
 * - uploadId: string - The upload ID to process
 *
 * Response:
 * - success: boolean
 * - jobId: string - Same as uploadId
 * - status: "processing"
 * - workflowRunId: string - The Workflow DevKit run ID
 */
app.post("/", async (c) => {
  // Get session token from header
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

  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}))
  const parsed = processRequestSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      },
      400
    )
  }

  const { uploadId } = parsed.data

  const triggerProcessing = Effect.fn("routes.process.trigger")(function* () {
    const uploadService = yield* UploadService
    const posthog = yield* PostHogService

    // Get upload and verify session token
    const upload = yield* uploadService.getById(uploadId)

    // Verify session token matches
    if (upload.sessionToken !== sessionToken) {
      return yield* Effect.fail(new UnauthorizedError({ reason: "INVALID_TOKEN" }))
    }

    // Trigger the workflow asynchronously (fire-and-forget)
    // The workflow will handle the actual processing
    const run = yield* Effect.promise(() => start(processImageWorkflow, [{ uploadId }]))
    const workflowRunId = run.runId

    // Update upload status to "processing" and store workflow run ID
    const updatedUpload = yield* uploadService.startProcessing(uploadId, workflowRunId)

    // Fire analytics event (server-side)
    yield* posthog.capture("processing_started", sessionToken, {
      upload_id: uploadId,
      workflow_run_id: workflowRunId,
    })

    return {
      upload: updatedUpload,
      workflowRunId,
    }
  })

  const program = triggerProcessing().pipe(Effect.provide(ProcessRoutesLive))

  const result = await Effect.runPromise(Effect.either(program))

  if (result._tag === "Left") {
    const error = result.left

    // Handle specific error types
    if (error instanceof NotFoundError) {
      return c.json(
        {
          error: "Upload not found",
          code: "NOT_FOUND",
        },
        404
      )
    }

    if (error instanceof UnauthorizedError) {
      return c.json(
        {
          error: "Invalid session token",
          code: error.reason,
        },
        401
      )
    }

    if (error instanceof AlreadyProcessingError) {
      return c.json(
        {
          error: "Upload is already being processed",
          code: "ALREADY_PROCESSING",
          currentStatus: error.currentStatus,
        },
        409
      )
    }

    // Generic error
    console.error("[process] Error triggering workflow:", error)
    return c.json(
      {
        error: "Failed to start processing",
        code: "WORKFLOW_ERROR",
      },
      500
    )
  }

  // Success - return immediately (fire-and-forget pattern)
  return c.json({
    success: true,
    jobId: uploadId,
    status: "processing",
    workflowRunId: result.right.workflowRunId,
  })
})

export default app
