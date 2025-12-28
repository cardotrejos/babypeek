import { Hono } from "hono";
import { Effect, Duration } from "effect";
import { z } from "zod";

import { UploadService } from "../services/UploadService";
import { PostHogService } from "../services/PostHogService";
import { GeminiService } from "../services/GeminiService";
import { R2Service } from "../services/R2Service";
import { ResultService, type CreatedResult } from "../services/ResultService";
import { AppServicesLive } from "../services";
import {
  UnauthorizedError,
  NotFoundError,
  AlreadyProcessingError,
  ProcessingError,
} from "../lib/errors";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import { getPrompt, type PromptVersion } from "../prompts/baby-portrait";
import { captureEffectError } from "../lib/sentry-effect";

// Processing timeout constant (FR-2.3: Complete processing in <90 seconds)
// Increased to 180s for generating 4 images
const PROCESSING_TIMEOUT_MS = 180_000;

// Prompt variants to generate (4 different styles)
const PROMPT_VARIANTS: PromptVersion[] = ["v3", "v3-json", "v4", "v4-json"];

const app = new Hono();

// =============================================================================
// Rate Limiting Middleware
// =============================================================================

// Apply rate limiting to prevent DoS attacks on workflow trigger
app.use("*", rateLimitMiddleware());

// =============================================================================
// Request Schemas
// =============================================================================

const processRequestSchema = z.object({
  uploadId: z.string().min(1, "Upload ID is required"),
});

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
  const sessionToken = c.req.header("X-Session-Token");

  if (!sessionToken) {
    return c.json(
      {
        error: "Session token is required",
        code: "MISSING_TOKEN",
      },
      401,
    );
  }

  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = processRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  const { uploadId } = parsed.data;

  // Core processing logic
  const processImageCore = Effect.gen(function* () {
    const uploadService = yield* UploadService;
    const posthog = yield* PostHogService;
    const gemini = yield* GeminiService;
    const r2 = yield* R2Service;
    const resultService = yield* ResultService;

    // Get upload and verify session token
    const upload = yield* uploadService.getById(uploadId);

    // Verify session token matches
    if (upload.sessionToken !== sessionToken) {
      return yield* Effect.fail(new UnauthorizedError({ reason: "INVALID_TOKEN" }));
    }

    // Track overall processing start time
    const processingStartTime = Date.now();

    // Track processing start
    yield* posthog.capture("processing_started", sessionToken, {
      upload_id: uploadId,
    });

    // Update status to processing
    yield* uploadService.startProcessing(uploadId, `sync-${Date.now()}`);

    // Update stage: validating
    yield* uploadService.updateStage(uploadId, "validating", 10);

    // Fetch original image from R2
    // Try multiple extensions since we don't know the original format
    const extensions = ["png", "jpg", "jpeg", "webp"];
    let imageUrl: string | null = null;

    for (const ext of extensions) {
      const imageKey = `uploads/${uploadId}/original.${ext}`;
      try {
        const presigned = yield* r2.generatePresignedDownloadUrl(imageKey, 300);
        imageUrl = presigned.url;
        break;
      } catch {
        // Try next extension
      }
    }

    if (!imageUrl) {
      yield* uploadService.updateStage(uploadId, "failed", 15);
      return yield* Effect.fail(new NotFoundError({ resource: "original image", id: uploadId }));
    }

    // Update stage: generating
    yield* uploadService.updateStage(uploadId, "generating", 20);

    // Generate 4 different images with different prompt variants
    const createdResults: CreatedResult[] = [];
    const totalVariants = PROMPT_VARIANTS.length;
    const generationStartTime = Date.now();

    for (let i = 0; i < totalVariants; i++) {
      const promptVersion = PROMPT_VARIANTS[i] as PromptVersion;
      const variantIndex = i + 1;
      const prompt = getPrompt(promptVersion);

      // Update progress (20-80% range for generation)
      const progress = 20 + Math.floor((i / totalVariants) * 60);
      yield* uploadService.updateStage(uploadId, "generating", progress);

      const variantStartTime = Date.now();

      // Generate image with this prompt variant
      const generatedImage = yield* gemini.generateImageFromUrl(imageUrl, prompt);

      const variantDurationMs = Date.now() - variantStartTime;

      // Track individual Gemini call
      yield* posthog.capture("gemini_call_completed", sessionToken, {
        upload_id: uploadId,
        variant_index: variantIndex,
        prompt_version: promptVersion,
        duration_ms: variantDurationMs,
        image_size_bytes: generatedImage.data.length,
      });

      // Store result in R2
      const createdResult = yield* resultService.create({
        uploadId,
        fullImageBuffer: generatedImage.data,
        mimeType: generatedImage.mimeType,
        promptVersion,
        variantIndex,
        generationTimeMs: variantDurationMs,
      });

      createdResults.push(createdResult);

      // Track result storage
      yield* posthog.capture("result_stored", sessionToken, {
        upload_id: uploadId,
        result_id: createdResult.resultId,
        variant_index: variantIndex,
        prompt_version: promptVersion,
        file_size_bytes: createdResult.fileSizeBytes,
      });
    }

    const totalGenerationTime = Date.now() - generationStartTime;

    // Update stage: storing (final cleanup)
    yield* uploadService.updateStage(uploadId, "storing", 90);

    // Update stage: complete
    yield* uploadService.updateStage(uploadId, "complete", 100);

    // Track processing complete
    yield* posthog.capture("processing_completed", sessionToken, {
      upload_id: uploadId,
      result_count: createdResults.length,
      result_ids: createdResults.map((r) => r.resultId),
      total_generation_time_ms: totalGenerationTime,
      total_duration_ms: Date.now() - processingStartTime,
    });

    // Return first result ID for backward compatibility, plus all results
    return {
      resultId: createdResults[0]?.resultId ?? "",
      resultUrl: createdResults[0]?.resultUrl ?? "",
      results: createdResults.map((r) => ({
        resultId: r.resultId,
        promptVersion: r.promptVersion,
        variantIndex: r.variantIndex,
      })),
    };
  });

  // Apply 90-second timeout (AC-5: Effect.timeout is used for the 90s limit)
  const processImage = processImageCore.pipe(
    Effect.timeout(Duration.millis(PROCESSING_TIMEOUT_MS)),
    // Handle timeout - mark job as failed and log to Sentry (AC-1, AC-4)
    Effect.catchTag("TimeoutException", () =>
      Effect.gen(function* () {
        const uploadService = yield* UploadService;
        const posthog = yield* PostHogService;

        // Get current upload state to preserve last stage/progress
        const upload = yield* uploadService
          .getById(uploadId)
          .pipe(Effect.catchAll(() => Effect.succeed(null)));

        const lastStage = upload?.stage ?? "unknown";
        const lastProgress = upload?.progress ?? 0;

        // Mark job as failed in database (AC-1)
        yield* uploadService.updateStage(uploadId, "failed", lastProgress);
        yield* uploadService.updateStatus(
          uploadId,
          "failed",
          "Processing timed out after 90 seconds",
        );

        // Create timeout error with context
        const timeoutError = new ProcessingError({
          cause: "TIMEOUT",
          message: "Processing timed out after 90 seconds",
          uploadId,
          lastStage,
          lastProgress,
        });

        // Log to Sentry with full context (AC-4)
        yield* captureEffectError(timeoutError, {
          uploadId,
          lastStage,
          lastProgress,
          durationMs: PROCESSING_TIMEOUT_MS,
        });

        // Track timeout analytics
        yield* posthog.capture("processing_timeout", uploadId, {
          upload_id: uploadId,
          last_stage: lastStage,
          last_progress: lastProgress,
          duration_ms: PROCESSING_TIMEOUT_MS,
        });

        return yield* Effect.fail(timeoutError);
      }),
    ),
  );

  const program = processImage.pipe(Effect.provide(AppServicesLive));

  const result = await Effect.runPromise(Effect.either(program));

  if (result._tag === "Left") {
    const error = result.left;

    // Handle specific error types
    if (error instanceof NotFoundError) {
      return c.json(
        {
          error: "Upload not found",
          code: "NOT_FOUND",
        },
        404,
      );
    }

    if (error instanceof UnauthorizedError) {
      return c.json(
        {
          error: "Invalid session token",
          code: error.reason,
        },
        401,
      );
    }

    if (error instanceof AlreadyProcessingError) {
      return c.json(
        {
          error: "Upload is already being processed",
          code: "ALREADY_PROCESSING",
          currentStatus: error.currentStatus,
        },
        409,
      );
    }

    // Handle timeout error specifically (AC-2: warm error message)
    if (error instanceof ProcessingError && error.cause === "TIMEOUT") {
      return c.json(
        {
          error: "This is taking longer than expected. Let's try again!",
          code: "PROCESSING_TIMEOUT",
          canRetry: true,
          jobId: uploadId,
          lastStage: error.lastStage,
          lastProgress: error.lastProgress,
        },
        408, // Request Timeout
      );
    }

    // Handle other processing errors
    if (error instanceof ProcessingError) {
      return c.json(
        {
          error: "Something went wrong. We'll give you a fresh start.",
          code: "PROCESSING_ERROR",
          cause: error.cause,
          canRetry: true,
          jobId: uploadId,
        },
        500,
      );
    }

    // Generic error
    console.error("[process] Error processing image:", error);
    return c.json(
      {
        error: "Failed to process image",
        code: "PROCESSING_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }

  // Success
  return c.json({
    success: true,
    jobId: uploadId,
    status: "complete",
    resultId: result.right.resultId,
  });
});

export default app;
