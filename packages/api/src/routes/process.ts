import { Hono } from "hono"
import { Effect } from "effect"
import { z } from "zod"

import { UploadService } from "../services/UploadService"
import { PostHogService } from "../services/PostHogService"
import { GeminiService } from "../services/GeminiService"
import { R2Service } from "../services/R2Service"
import { ResultService } from "../services/ResultService"
import { AppServicesLive } from "../services"
import { UnauthorizedError, NotFoundError, AlreadyProcessingError } from "../lib/errors"
import { rateLimitMiddleware } from "../middleware/rate-limit"
import { getPrompt } from "../prompts/baby-portrait"

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
 * Process the uploaded image using Gemini AI.
 * This endpoint processes the image synchronously (within Vercel's function timeout).
 *
 * Flow:
 * 1. Validates the session token
 * 2. Verifies the upload exists and is in "pending" status
 * 3. Updates status to "processing"
 * 4. Fetches original image from R2
 * 5. Calls Gemini to generate the image
 * 6. Stores result in R2
 * 7. Updates status to "complete"
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
 * - status: "complete" | "failed"
 * - resultId?: string - The result ID (on success)
 * - error?: string - Error message (on failure)
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

  const processImage = Effect.gen(function* () {
    const uploadService = yield* UploadService
    const posthog = yield* PostHogService
    const gemini = yield* GeminiService
    const r2 = yield* R2Service
    const resultService = yield* ResultService

    // Get upload and verify session token
    const upload = yield* uploadService.getById(uploadId)

    // Verify session token matches
    if (upload.sessionToken !== sessionToken) {
      return yield* Effect.fail(new UnauthorizedError({ reason: "INVALID_TOKEN" }))
    }

    // Track processing start
    yield* posthog.capture("processing_started", sessionToken, {
      upload_id: uploadId,
    })

    // Update status to processing
    yield* uploadService.startProcessing(uploadId, `sync-${Date.now()}`)

    // Update stage: validating
    yield* uploadService.updateStage(uploadId, "validating", 10)

    // Fetch original image from R2
    // Try multiple extensions since we don't know the original format
    const extensions = ["png", "jpg", "jpeg", "webp"]
    let imageUrl: string | null = null

    for (const ext of extensions) {
      const imageKey = `uploads/${uploadId}/original.${ext}`
      try {
        const presigned = yield* r2.generatePresignedDownloadUrl(imageKey, 300)
        imageUrl = presigned.url
        break
      } catch {
        // Try next extension
      }
    }

    if (!imageUrl) {
      yield* uploadService.updateStage(uploadId, "failed", 15)
      return yield* Effect.fail(new NotFoundError({ resource: "original image", id: uploadId }))
    }

    // Update stage: generating
    yield* uploadService.updateStage(uploadId, "generating", 30)

    // Get the prompt and call Gemini
    const prompt = getPrompt("v3")
    const startTime = Date.now()

    const generatedImage = yield* gemini.generateImageFromUrl(imageUrl, prompt)

    const durationMs = Date.now() - startTime

    // Track Gemini success
    yield* posthog.capture("gemini_call_completed", sessionToken, {
      upload_id: uploadId,
      duration_ms: durationMs,
      image_size_bytes: generatedImage.data.length,
    })

    // Update stage: storing
    yield* uploadService.updateStage(uploadId, "storing", 80)

    // Store result in R2
    const createdResult = yield* resultService.create({
      uploadId,
      fullImageBuffer: generatedImage.data,
      mimeType: generatedImage.mimeType,
    })

    // Track result storage
    yield* posthog.capture("result_stored", sessionToken, {
      upload_id: uploadId,
      result_id: createdResult.resultId,
      file_size_bytes: createdResult.fileSizeBytes,
    })

    // Update stage: complete
    yield* uploadService.updateStage(uploadId, "complete", 100)

    // Track processing complete
    yield* posthog.capture("processing_completed", sessionToken, {
      upload_id: uploadId,
      result_id: createdResult.resultId,
      total_duration_ms: Date.now() - startTime,
    })

    return {
      resultId: createdResult.resultId,
      resultUrl: createdResult.resultUrl,
    }
  })

  const program = processImage.pipe(Effect.provide(AppServicesLive))

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
    console.error("[process] Error processing image:", error)
    return c.json(
      {
        error: "Failed to process image",
        code: "PROCESSING_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }

  // Success
  return c.json({
    success: true,
    jobId: uploadId,
    status: "complete",
    resultId: result.right.resultId,
  })
})

export default app
