/**
 * GeminiService Tests
 *
 * Tests for the Gemini Imagen 3 integration service.
 * Uses mock implementations to avoid actual API calls.
 *
 * @see Story 4.2 - Gemini Imagen 3 Integration
 */

import { describe, it, expect } from "vitest"
import { Effect, Layer, Exit } from "effect"
import {
  GeminiService,
  GeminiServiceMock,
  GeminiServiceErrorMock,
  type GeneratedImage,
} from "./GeminiService"
import { GeminiError } from "../lib/errors"

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Run a GeminiService effect with the given layer.
 */
async function runWithLayer<A, E>(
  effect: Effect.Effect<A, E, GeminiService>,
  layer: Layer.Layer<GeminiService, never, never>
): Promise<Exit.Exit<A, E>> {
  const program = effect.pipe(Effect.provide(layer))
  return Effect.runPromiseExit(program)
}

/**
 * Create a test image buffer.
 */
function createTestImageBuffer(): Buffer {
  // JPEG magic bytes: FF D8 FF
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
}

// =============================================================================
// GeminiService Mock Tests
// =============================================================================

describe("GeminiService", () => {
  describe("GeminiServiceMock", () => {
    it("should return mock image data for generateImage", async () => {
      const effect = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImage(createTestImageBuffer(), "test prompt")
      })

      const exit = await runWithLayer(effect, GeminiServiceMock)

      expect(Exit.isSuccess(exit)).toBe(true)
      if (Exit.isSuccess(exit)) {
        const result = exit.value as GeneratedImage
        expect(result.data).toBeInstanceOf(Buffer)
        expect(result.mimeType).toBe("image/jpeg")
      }
    })

    it("should return mock image data for generateImageFromUrl", async () => {
      const effect = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImageFromUrl("https://example.com/image.jpg", "test prompt")
      })

      const exit = await runWithLayer(effect, GeminiServiceMock)

      expect(Exit.isSuccess(exit)).toBe(true)
      if (Exit.isSuccess(exit)) {
        const result = exit.value as GeneratedImage
        expect(result.data).toBeInstanceOf(Buffer)
        expect(result.mimeType).toBe("image/jpeg")
      }
    })
  })

  describe("GeminiServiceErrorMock", () => {
    it("should return RATE_LIMITED error", async () => {
      const effect = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImage(createTestImageBuffer(), "test prompt")
      })

      const errorLayer = GeminiServiceErrorMock("RATE_LIMITED", "Rate limit exceeded")
      const exit = await runWithLayer(effect, errorLayer)

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        const error = exit.cause
        // Extract the error from the cause
        const failure = error as { _tag: string; error: GeminiError }
        expect(failure._tag).toBe("Fail")
        expect(failure.error._tag).toBe("GeminiError")
        expect(failure.error.cause).toBe("RATE_LIMITED")
      }
    })

    it("should return CONTENT_POLICY error", async () => {
      const effect = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImage(createTestImageBuffer(), "test prompt")
      })

      const errorLayer = GeminiServiceErrorMock("CONTENT_POLICY", "Content blocked by safety filters")
      const exit = await runWithLayer(effect, errorLayer)

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        const failure = exit.cause as { _tag: string; error: GeminiError }
        expect(failure.error.cause).toBe("CONTENT_POLICY")
      }
    })

    it("should return INVALID_IMAGE error", async () => {
      const effect = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImage(createTestImageBuffer(), "test prompt")
      })

      const errorLayer = GeminiServiceErrorMock("INVALID_IMAGE", "Invalid input image")
      const exit = await runWithLayer(effect, errorLayer)

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        const failure = exit.cause as { _tag: string; error: GeminiError }
        expect(failure.error.cause).toBe("INVALID_IMAGE")
      }
    })

    it("should return API_ERROR error", async () => {
      const effect = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImage(createTestImageBuffer(), "test prompt")
      })

      const errorLayer = GeminiServiceErrorMock("API_ERROR", "Generic API error")
      const exit = await runWithLayer(effect, errorLayer)

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        const failure = exit.cause as { _tag: string; error: GeminiError }
        expect(failure.error.cause).toBe("API_ERROR")
      }
    })

    it("should return TIMEOUT error", async () => {
      const effect = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImage(createTestImageBuffer(), "test prompt")
      })

      const errorLayer = GeminiServiceErrorMock("TIMEOUT", "Request timed out")
      const exit = await runWithLayer(effect, errorLayer)

      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        const failure = exit.cause as { _tag: string; error: GeminiError }
        expect(failure.error.cause).toBe("TIMEOUT")
      }
    })
  })
})

// =============================================================================
// Prompt Template Tests
// =============================================================================

describe("Prompt Templates", () => {
  it("should export v1 prompt", async () => {
    const { PROMPTS } = await import("../prompts/baby-portrait")
    expect(PROMPTS.v1).toBeDefined()
    expect(typeof PROMPTS.v1).toBe("string")
    expect(PROMPTS.v1.length).toBeGreaterThan(100)
  })

  it("should export v2 prompt", async () => {
    const { PROMPTS } = await import("../prompts/baby-portrait")
    expect(PROMPTS.v2).toBeDefined()
    expect(typeof PROMPTS.v2).toBe("string")
    expect(PROMPTS.v2.length).toBeGreaterThan(50)
  })

  it("should return default v1 prompt via getPrompt()", async () => {
    const { getPrompt, PROMPTS } = await import("../prompts/baby-portrait")
    expect(getPrompt()).toBe(PROMPTS.v1)
  })

  it("should return specific version via getPrompt(version)", async () => {
    const { getPrompt, PROMPTS } = await import("../prompts/baby-portrait")
    expect(getPrompt("v1")).toBe(PROMPTS.v1)
    expect(getPrompt("v2")).toBe(PROMPTS.v2)
  })

  it("should contain required prompt elements", async () => {
    const { PROMPTS } = await import("../prompts/baby-portrait")

    // v1 should contain key instructions
    expect(PROMPTS.v1).toContain("ultrasound")
    expect(PROMPTS.v1).toContain("photorealistic")
    expect(PROMPTS.v1).toContain("baby")
    expect(PROMPTS.v1).toContain("Safety guidelines")

    // v2 should also contain key elements
    expect(PROMPTS.v2).toContain("ultrasound")
    expect(PROMPTS.v2).toContain("photorealistic")
    expect(PROMPTS.v2).toContain("baby")
  })

  it("should list available versions", async () => {
    const { getAvailableVersions } = await import("../prompts/baby-portrait")
    const versions = getAvailableVersions()
    expect(versions).toContain("v1")
    expect(versions).toContain("v2")
    expect(versions.length).toBe(2)
  })
})

// =============================================================================
// Gemini Client Tests
// =============================================================================

describe("Gemini Client Utilities", () => {
  it("should convert buffer to base64", async () => {
    const { bufferToBase64 } = await import("../lib/gemini")
    const buffer = Buffer.from("test data")
    const base64 = bufferToBase64(buffer)
    expect(base64).toBe(buffer.toString("base64"))
  })

  it("should convert base64 back to buffer", async () => {
    const { base64ToBuffer } = await import("../lib/gemini")
    const originalData = "test data"
    const base64 = Buffer.from(originalData).toString("base64")
    const buffer = base64ToBuffer(base64)
    expect(buffer.toString()).toBe(originalData)
  })

  it("should infer JPEG mime type", async () => {
    const { inferMimeType } = await import("../lib/gemini")
    // JPEG magic bytes
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
    expect(inferMimeType(jpegBuffer)).toBe("image/jpeg")
  })

  it("should infer PNG mime type", async () => {
    const { inferMimeType } = await import("../lib/gemini")
    // PNG magic bytes
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    expect(inferMimeType(pngBuffer)).toBe("image/png")
  })

  it("should infer WebP mime type", async () => {
    const { inferMimeType } = await import("../lib/gemini")
    // WebP magic bytes (RIFF)
    const webpBuffer = Buffer.from([0x52, 0x49, 0x46, 0x46])
    expect(inferMimeType(webpBuffer)).toBe("image/webp")
  })

  it("should default to JPEG for unknown formats", async () => {
    const { inferMimeType } = await import("../lib/gemini")
    const unknownBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00])
    expect(inferMimeType(unknownBuffer)).toBe("image/jpeg")
  })
})

// =============================================================================
// GeminiError Tests
// =============================================================================

describe("GeminiError", () => {
  it("should create RATE_LIMITED error", () => {
    const error = new GeminiError({
      cause: "RATE_LIMITED",
      message: "Rate limit exceeded",
    })
    expect(error._tag).toBe("GeminiError")
    expect(error.cause).toBe("RATE_LIMITED")
    expect(error.message).toBe("Rate limit exceeded")
  })

  it("should create CONTENT_POLICY error", () => {
    const error = new GeminiError({
      cause: "CONTENT_POLICY",
      message: "Content blocked",
    })
    expect(error.cause).toBe("CONTENT_POLICY")
  })

  it("should create INVALID_IMAGE error", () => {
    const error = new GeminiError({
      cause: "INVALID_IMAGE",
      message: "Invalid image format",
    })
    expect(error.cause).toBe("INVALID_IMAGE")
  })

  it("should create API_ERROR error", () => {
    const error = new GeminiError({
      cause: "API_ERROR",
      message: "API call failed",
    })
    expect(error.cause).toBe("API_ERROR")
  })

  it("should create TIMEOUT error", () => {
    const error = new GeminiError({
      cause: "TIMEOUT",
      message: "Request timed out",
    })
    expect(error.cause).toBe("TIMEOUT")
  })
})
