/**
 * Gemini Service
 *
 * Effect-based service for calling Gemini native image generation API to transform
 * 4D ultrasound images into photorealistic baby portraits.
 *
 * Uses gemini-3-pro-image-preview (Nano Banana Pro) for highest quality output:
 * - Up to 14 reference images
 * - 1K/2K/4K resolution output
 * - Thinking mode for complex prompts
 * - Native image generation (responseModalities: ['text', 'image'])
 *
 * Features:
 * - Effect.tryPromise for error handling
 * - 60 second timeout
 * - Typed GeminiError for different failure scenarios
 * - Retry logic with exponential backoff
 * - Configurable image output (aspect ratio, resolution)
 *
 * @see Story 4.2 - Gemini Imagen 3 Integration
 * @see Story 4.2.1 - Prompt Optimization (Nano Banana Pro Style)
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

import { Effect, Context, Layer, Schedule, Duration, pipe, Ref } from "effect"
import { GeminiError, isRetryableGeminiError } from "../lib/errors"
import { geminiRetrySchedule } from "../lib/retry"
import { addEffectBreadcrumb, captureEffectError } from "../lib/sentry-effect"
import { PostHogService } from "./PostHogService"
import {
  getGeminiClient,
  IMAGEN_MODEL,
  SAFETY_SETTINGS,
  GENERATION_CONFIG,
  DEFAULT_IMAGE_CONFIG,
  bufferToBase64,
  inferMimeType,
  type ImageGenerationConfig,
} from "../lib/gemini"
import { isGeminiConfigured, env } from "../lib/env"

// =============================================================================
// Service Types
// =============================================================================

/**
 * Generated image result from Gemini API.
 * Returns image data as a Buffer with its MIME type.
 */
export interface GeneratedImage {
  data: Buffer
  mimeType: string
}

// =============================================================================
// Gemini Service Definition
// =============================================================================

/**
 * Options for image generation.
 */
export interface GenerateImageOptions {
  /** Image configuration (aspect ratio, size) */
  imageConfig?: ImageGenerationConfig
  /** Upload ID for tracking retries in analytics (Story 4.3) */
  uploadId?: string
}

/**
 * Gemini Service interface.
 * Provides image generation capabilities using Google's Gemini API.
 *
 * Requirements:
 * - PostHogService: For analytics tracking (gemini_retry, gemini_exhausted events)
 */
export class GeminiService extends Context.Tag("GeminiService")<
  GeminiService,
  {
    /**
     * Generate a photorealistic image from an input image and prompt.
     *
     * @param imageBuffer - The input image as a Buffer
     * @param prompt - The transformation prompt
     * @param options - Optional image generation config
     * @returns Effect containing the generated image data
     */
    generateImage: (
      imageBuffer: Buffer,
      prompt: string,
      options?: GenerateImageOptions
    ) => Effect.Effect<GeneratedImage, GeminiError, PostHogService>

    /**
     * Generate an image from a URL (fetches the image first).
     *
     * @param imageUrl - URL of the input image
     * @param prompt - The transformation prompt
     * @param options - Optional image generation config
     * @returns Effect containing the generated image data
     */
    generateImageFromUrl: (
      imageUrl: string,
      prompt: string,
      options?: GenerateImageOptions
    ) => Effect.Effect<GeneratedImage, GeminiError, PostHogService>
  }
>() {}

// =============================================================================
// Error Mapping
// =============================================================================

/**
 * Map Gemini SDK errors to typed GeminiError.
 * Categorizes errors for proper handling and analytics.
 * Preserves originalError for Sentry logging.
 */
function mapGeminiError(error: unknown): GeminiError {
  const message = error instanceof Error ? error.message : String(error)
  const errorStr = message.toLowerCase()

  // Rate limiting (429 errors)
  if (errorStr.includes("429") || errorStr.includes("resource_exhausted") || errorStr.includes("quota")) {
    return new GeminiError({
      cause: "RATE_LIMITED",
      message: `Gemini API rate limit exceeded: ${message}`,
      originalError: error,
    })
  }

  // Content policy violations
  if (
    errorStr.includes("safety") ||
    errorStr.includes("blocked") ||
    errorStr.includes("harm") ||
    errorStr.includes("policy")
  ) {
    return new GeminiError({
      cause: "CONTENT_POLICY",
      message: `Content was blocked by safety filters: ${message}`,
      originalError: error,
    })
  }

  // Invalid input image
  if (
    errorStr.includes("invalid_argument") ||
    errorStr.includes("invalid image") ||
    errorStr.includes("unsupported") ||
    errorStr.includes("corrupted")
  ) {
    return new GeminiError({
      cause: "INVALID_IMAGE",
      message: `Invalid or corrupted input image: ${message}`,
      originalError: error,
    })
  }

  // Generic API error
  return new GeminiError({
    cause: "API_ERROR",
    message: `Gemini API error: ${message}`,
    originalError: error,
  })
}

// =============================================================================
// Service Implementation
// =============================================================================

/**
 * Fetch image from URL and return as Buffer.
 */
const fetchImageBuffer = (url: string): Effect.Effect<Buffer, GeminiError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    },
    catch: (e) =>
      new GeminiError({
        cause: "INVALID_IMAGE",
        message: `Failed to fetch image from URL: ${e}`,
      }),
  })

/**
 * Call the Gemini API to generate an image.
 * Uses gemini-3-pro-image-preview (Nano Banana Pro) with native image generation.
 *
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
const callGeminiApi = (
  imageBuffer: Buffer,
  prompt: string,
  options?: GenerateImageOptions
): Effect.Effect<GeneratedImage, GeminiError> =>
  Effect.gen(function* () {
    const client = getGeminiClient()

    if (!client) {
      return yield* Effect.fail(
        new GeminiError({
          cause: "API_ERROR",
          message: "Gemini API not configured. Set GEMINI_API_KEY in environment.",
        })
      )
    }

    // Merge with default image config
    const imageConfig = { ...DEFAULT_IMAGE_CONFIG, ...options?.imageConfig }

    // Get the generative model with image generation support
    // Note: responseModalities must include 'image' for native image generation
    const model = client.getGenerativeModel({
      model: IMAGEN_MODEL,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        ...GENERATION_CONFIG,
        // Enable image output - this is required for gemini-3-pro-image-preview
        // @ts-expect-error - responseModalities not in SDK types yet but supported by API
        responseModalities: ["text", "image"],
      },
    })

    // Prepare image data for the API
    const mimeType = inferMimeType(imageBuffer)
    const base64Data = bufferToBase64(imageBuffer)

    // Call the API with image and prompt
    const result = yield* Effect.tryPromise({
      try: async () => {
        // For development/testing without API key, return mock response
        if (env.NODE_ENV === "development" && !isGeminiConfigured()) {
          console.warn(
            `[GeminiService] DEV MODE: No GEMINI_API_KEY configured. Returning mock placeholder image.`
          )
          const mockPlaceholder = Buffer.from(`MOCK_GEMINI_OUTPUT_${Date.now()}`)
          return {
            data: mockPlaceholder,
            mimeType: "image/png",
          }
        }

        console.log(`[GeminiService] Calling ${IMAGEN_MODEL} with imageConfig:`, imageConfig)

        const response = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ])

        const generatedContent = response.response

        // Check for safety blocks
        if (generatedContent.promptFeedback?.blockReason) {
          throw new Error(`Content blocked: ${generatedContent.promptFeedback.blockReason}`)
        }

        // Try to extract generated image from response
        // Nano Banana Pro returns images in inlineData
        const candidates = generatedContent.candidates
        if (candidates && candidates.length > 0) {
          const firstCandidate = candidates[0]
          const parts = firstCandidate?.content?.parts
          if (parts) {
            for (const part of parts) {
              if ("inlineData" in part && part.inlineData && part.inlineData.data) {
                const imageData = part.inlineData
                console.log(`[GeminiService] Successfully generated image, mimeType: ${imageData.mimeType}`)
                return {
                  data: Buffer.from(imageData.data, "base64"),
                  mimeType: imageData.mimeType ?? "image/png",
                }
              }
            }
          }
        }

        // If no image in response, check for text response (might be an error or thinking)
        let textResponse = ""
        try {
          textResponse = generatedContent.text()
        } catch {
          // No text available
        }

        // If no image in response, this model may not have generated one
        throw new Error(
          `Model ${IMAGEN_MODEL} did not return generated image. ` +
          `Text response: ${textResponse.substring(0, 200) || "(none)"}`
        )
      },
      catch: mapGeminiError,
    })

    return result
  })

/**
 * Generate image with retry logic, Sentry logging, and PostHog analytics.
 *
 * Retry behavior (per AC-1, AC-2, AC-3):
 * - Max 3 retries (4 total attempts)
 * - Exponential backoff: 1s -> 2s -> 4s with jitter
 * - Only retries on RATE_LIMITED, API_ERROR, TIMEOUT
 * - INVALID_IMAGE and CONTENT_POLICY fail immediately
 *
 * Observability (per AC-4, AC-5):
 * - Sentry breadcrumb on each retry attempt
 * - PostHog `gemini_retry` event on each retry
 * - PostHog `gemini_exhausted` when all retries fail
 * - Final failure captured to Sentry with full context
 *
 * @see Story 4.3 - Retry Logic with Exponential Backoff
 */
const generateImageWithRetry = (
  imageBuffer: Buffer,
  prompt: string,
  options?: GenerateImageOptions
): Effect.Effect<GeneratedImage, GeminiError, PostHogService> =>
  Effect.gen(function* () {
    const startTime = Date.now()
    // Use Ref for thread-safe attempt tracking (fixes race condition)
    const attemptRef = yield* Ref.make(0)
    const posthog = yield* PostHogService
    const uploadId = options?.uploadId
    const distinctId = uploadId ?? `unknown-${Date.now()}`

    // Create a retry schedule that logs each retry
    const retryScheduleWithLogging = pipe(
      geminiRetrySchedule,
      Schedule.tapInput((error: GeminiError) =>
        Effect.gen(function* () {
          const attemptNumber = yield* Ref.updateAndGet(attemptRef, (n) => n + 1)
          const timeSinceStart = Date.now() - startTime

          // Log retry to Sentry as breadcrumb (AC-4)
          yield* addEffectBreadcrumb(
            `Gemini API retry attempt ${attemptNumber}`,
            "gemini",
            {
              attempt: attemptNumber,
              error_type: error.cause,
              error_message: error.message,
              time_since_start_ms: timeSinceStart,
              upload_id: uploadId,
            }
          )

          // Track retry in PostHog (AC-5)
          yield* posthog.capture("gemini_retry", distinctId, {
            upload_id: uploadId,
            attempt: attemptNumber + 1, // Next attempt number
            error_type: error.cause,
            previous_error_message: error.message,
            time_since_start_ms: timeSinceStart,
          })
        })
      ),
      // Only retry on retryable errors (AC-1, AC-3)
      Schedule.whileInput(isRetryableGeminiError)
    )

    // Execute with retry
    const result = yield* callGeminiApi(imageBuffer, prompt, options).pipe(
      Effect.retry(retryScheduleWithLogging),
      // 60 second timeout for entire retry chain (Story 4.6 handles workflow timeout)
      Effect.timeout(Duration.seconds(60)),
      // Map timeout to GeminiError
      Effect.catchTag("TimeoutException", () =>
        Effect.gen(function* () {
          const attemptNumber = yield* Ref.get(attemptRef)
          return yield* Effect.fail(
            new GeminiError({
              cause: "TIMEOUT",
              message: "Gemini API timed out after 60 seconds",
              attempt: attemptNumber + 1,
            })
          )
        })
      ),
      // On final failure, log to Sentry and track exhaustion
      Effect.tapError((finalError) =>
        Effect.gen(function* () {
          const totalDuration = Date.now() - startTime
          const attemptNumber = yield* Ref.get(attemptRef)
          const totalAttempts = attemptNumber + 1

          // Only track exhaustion if we actually retried
          if (totalAttempts > 1 && isRetryableGeminiError(finalError)) {
            yield* posthog.capture("gemini_exhausted", distinctId, {
              upload_id: uploadId,
              total_attempts: totalAttempts,
              final_error_type: finalError.cause,
              final_error_message: finalError.message,
              total_duration_ms: totalDuration,
            })
          }

          // Capture final failure to Sentry with full context
          yield* captureEffectError(finalError, {
            service: "gemini",
            upload_id: uploadId,
            total_attempts: totalAttempts,
            total_duration_ms: totalDuration,
            is_retryable: isRetryableGeminiError(finalError),
          })
        })
      )
    )

    return result
  })

/**
 * Implementation of generateImage.
 */
const generateImage = Effect.fn("GeminiService.generateImage")(function* (
  imageBuffer: Buffer,
  prompt: string,
  options?: GenerateImageOptions
) {
  return yield* generateImageWithRetry(imageBuffer, prompt, options)
})

/**
 * Implementation of generateImageFromUrl.
 */
const generateImageFromUrl = Effect.fn("GeminiService.generateImageFromUrl")(function* (
  imageUrl: string,
  prompt: string,
  options?: GenerateImageOptions
) {
  // Fetch the image from URL
  const imageBuffer = yield* fetchImageBuffer(imageUrl)

  // Generate the image
  return yield* generateImageWithRetry(imageBuffer, prompt, options)
})

// =============================================================================
// Service Layer
// =============================================================================

/**
 * Live implementation of GeminiService.
 */
export const GeminiServiceLive = Layer.succeed(GeminiService, {
  generateImage,
  generateImageFromUrl,
})

// =============================================================================
// Test/Mock Implementation
// =============================================================================

/**
 * Mock implementation for testing.
 * Returns a predictable response without calling the API.
 * Note: Returns Effect that requires PostHogService to match interface signature.
 */
export const GeminiServiceMock = Layer.succeed(GeminiService, {
  generateImage: (_imageBuffer: Buffer, _prompt: string, _options?: GenerateImageOptions) =>
    Effect.gen(function* () {
      // Access PostHogService to satisfy type requirement (no-op in mock)
      yield* PostHogService
      return {
        data: Buffer.from("mock-generated-image-data"),
        mimeType: "image/png",
      }
    }),
  generateImageFromUrl: (_imageUrl: string, _prompt: string, _options?: GenerateImageOptions) =>
    Effect.gen(function* () {
      yield* PostHogService
      return {
        data: Buffer.from("mock-generated-image-data"),
        mimeType: "image/png",
      }
    }),
})

/**
 * Error mock for testing error scenarios.
 * Properly requires PostHogService to match interface.
 */
export const GeminiServiceErrorMock = (cause: GeminiError["cause"], message: string) =>
  Layer.succeed(GeminiService, {
    generateImage: (_imageBuffer?: Buffer, _prompt?: string, _options?: GenerateImageOptions) =>
      Effect.gen(function* () {
        yield* PostHogService
        return yield* Effect.fail(new GeminiError({ cause, message }))
      }),
    generateImageFromUrl: (_imageUrl?: string, _prompt?: string, _options?: GenerateImageOptions) =>
      Effect.gen(function* () {
        yield* PostHogService
        return yield* Effect.fail(new GeminiError({ cause, message }))
      }),
  })
