/**
 * Gemini Service
 *
 * Effect-based service for calling Gemini Imagen 3 API to transform
 * 4D ultrasound images into photorealistic baby portraits.
 *
 * Features:
 * - Effect.tryPromise for error handling
 * - 60 second timeout
 * - Typed GeminiError for different failure scenarios
 * - Retry logic with exponential backoff
 *
 * @see Story 4.2 - Gemini Imagen 3 Integration
 */

import { Effect, Context, Layer, Schedule } from "effect"
import { GeminiError } from "../lib/errors"
import { getGeminiClient, IMAGEN_MODEL, SAFETY_SETTINGS, GENERATION_CONFIG, bufferToBase64, inferMimeType } from "../lib/gemini"
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
 * Gemini Service interface.
 * Provides image generation capabilities using Google's Gemini API.
 */
export class GeminiService extends Context.Tag("GeminiService")<
  GeminiService,
  {
    /**
     * Generate a photorealistic image from an input image and prompt.
     *
     * @param imageBuffer - The input image as a Buffer
     * @param prompt - The transformation prompt
     * @returns Effect containing the generated image data
     */
    generateImage: (imageBuffer: Buffer, prompt: string) => Effect.Effect<GeneratedImage, GeminiError>

    /**
     * Generate an image from a URL (fetches the image first).
     *
     * @param imageUrl - URL of the input image
     * @param prompt - The transformation prompt
     * @returns Effect containing the generated image data
     */
    generateImageFromUrl: (imageUrl: string, prompt: string) => Effect.Effect<GeneratedImage, GeminiError>
  }
>() {}

// =============================================================================
// Error Mapping
// =============================================================================

/**
 * Map Gemini SDK errors to typed GeminiError.
 * Categorizes errors for proper handling and analytics.
 */
function mapGeminiError(error: unknown): GeminiError {
  const message = error instanceof Error ? error.message : String(error)
  const errorStr = message.toLowerCase()

  // Rate limiting (429 errors)
  if (errorStr.includes("429") || errorStr.includes("resource_exhausted") || errorStr.includes("quota")) {
    return new GeminiError({
      cause: "RATE_LIMITED",
      message: `Gemini API rate limit exceeded: ${message}`,
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
    })
  }

  // Generic API error
  return new GeminiError({
    cause: "API_ERROR",
    message: `Gemini API error: ${message}`,
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
 * Uses the generative model with image input.
 */
const callGeminiApi = (imageBuffer: Buffer, prompt: string): Effect.Effect<GeneratedImage, GeminiError> =>
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

    // Get the generative model
    const model = client.getGenerativeModel({
      model: IMAGEN_MODEL,
      safetySettings: SAFETY_SETTINGS,
      generationConfig: GENERATION_CONFIG,
    })

    // Prepare image data for the API
    const mimeType = inferMimeType(imageBuffer)
    const base64Data = bufferToBase64(imageBuffer)

    // Call the API with image and prompt
    const result = yield* Effect.tryPromise({
      try: async () => {
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

        // Extract the response text (for vision models, this describes what to generate)
        const text = generatedContent.text()

        // For now, since Imagen 3 proper image generation may require different API,
        // we return the response as a placeholder
        // In production, this would be the actual generated image bytes
        // The exact API may vary based on Google's Imagen 3 availability

        // Note: If using imagen-3.0-generate-001 model, the response format may differ
        // This implementation uses the generative model approach
        // When Imagen 3 is fully available, update to use the correct endpoint

        // For development/testing, return a placeholder response
        // Real implementation would extract image data from response.candidates[0].content.parts[0].inlineData
        if (env.NODE_ENV === "development" && !isGeminiConfigured()) {
          console.log(`[GeminiService] Mock response: ${text.substring(0, 100)}...`)
          return {
            data: imageBuffer, // Return input as mock output in dev
            mimeType: "image/jpeg",
          }
        }

        // Try to extract generated image from response
        const candidates = generatedContent.candidates
        if (candidates && candidates.length > 0) {
          const firstCandidate = candidates[0]
          const parts = firstCandidate?.content?.parts
          if (parts) {
            for (const part of parts) {
              if ("inlineData" in part && part.inlineData && part.inlineData.data) {
                const imageData = part.inlineData
                return {
                  data: Buffer.from(imageData.data, "base64"),
                  mimeType: imageData.mimeType ?? "image/jpeg",
                }
              }
            }
          }
        }

        // If no image in response, this model may not support image generation
        // Return a descriptive error
        throw new Error(
          `Model ${IMAGEN_MODEL} did not return generated image. Response: ${text.substring(0, 200)}`
        )
      },
      catch: mapGeminiError,
    })

    return result
  })

/**
 * Generate image with retry logic and timeout.
 */
const generateImageWithRetry = (imageBuffer: Buffer, prompt: string): Effect.Effect<GeneratedImage, GeminiError> =>
  callGeminiApi(imageBuffer, prompt).pipe(
    // Retry up to 3 times with exponential backoff for transient errors
    Effect.retry({
      times: 3,
      schedule: Schedule.exponential("1 second"),
      // Only retry on rate limiting or transient API errors
      while: (error) => error.cause === "RATE_LIMITED" || error.cause === "API_ERROR",
    }),
    // 60 second timeout
    Effect.timeout("60 seconds"),
    // Map timeout to GeminiError
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(
        new GeminiError({
          cause: "TIMEOUT",
          message: "Gemini API timed out after 60 seconds",
        })
      )
    )
  )

/**
 * Implementation of generateImage.
 */
const generateImage = Effect.fn("GeminiService.generateImage")(function* (imageBuffer: Buffer, prompt: string) {
  return yield* generateImageWithRetry(imageBuffer, prompt)
})

/**
 * Implementation of generateImageFromUrl.
 */
const generateImageFromUrl = Effect.fn("GeminiService.generateImageFromUrl")(function* (
  imageUrl: string,
  prompt: string
) {
  // Fetch the image from URL
  const imageBuffer = yield* fetchImageBuffer(imageUrl)

  // Generate the image
  return yield* generateImageWithRetry(imageBuffer, prompt)
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
 */
export const GeminiServiceMock = Layer.succeed(GeminiService, {
  generateImage: (_imageBuffer: Buffer, _prompt: string) =>
    Effect.succeed({
      data: Buffer.from("mock-generated-image-data"),
      mimeType: "image/jpeg",
    }),
  generateImageFromUrl: (_imageUrl: string, _prompt: string) =>
    Effect.succeed({
      data: Buffer.from("mock-generated-image-data"),
      mimeType: "image/jpeg",
    }),
})

/**
 * Error mock for testing error scenarios.
 */
export const GeminiServiceErrorMock = (cause: GeminiError["cause"], message: string) =>
  Layer.succeed(GeminiService, {
    generateImage: () => Effect.fail(new GeminiError({ cause, message })),
    generateImageFromUrl: () => Effect.fail(new GeminiError({ cause, message })),
  })
