/**
 * GeminiService Retry Integration Tests
 *
 * Tests that verify Sentry breadcrumbs and PostHog analytics
 * are correctly called during retry operations.
 *
 * NOTE: These tests verify the retry behavior by testing the actual
 * GeminiServiceLive implementation with mocked external dependencies
 * (Gemini client, PostHog, Sentry).
 *
 * @see Story 4.3 - Retry Logic with Exponential Backoff
 * @see AC-4 - All retries are logged to Sentry with context
 * @see AC-5 - gemini_retry analytics event is fired on each retry
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Effect, Layer } from "effect"
import { GeminiService, GeminiServiceLive } from "./GeminiService"
import { PostHogService } from "./PostHogService"
import { GeminiError } from "../lib/errors"

// =============================================================================
// Mock State - Using globalThis for cross-module access
// =============================================================================

// Extend globalThis to include our mock state
declare global {
  // eslint-disable-next-line no-var
  var __geminiMockState: {
    callAttempts: number
    shouldFailCount: number
    errorCause: GeminiError["cause"]
  }
}

// Initialize global mock state
globalThis.__geminiMockState = {
  callAttempts: 0,
  shouldFailCount: 0,
  errorCause: "RATE_LIMITED",
}

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the gemini module to control API responses
vi.mock("../lib/gemini", () => {
  return {
    getGeminiClient: vi.fn(() => ({
      getGenerativeModel: vi.fn(() => ({
        generateContent: vi.fn(async () => {
          const state = globalThis.__geminiMockState
          state.callAttempts++

          if (state.callAttempts <= state.shouldFailCount) {
            const error = new Error(`Attempt ${state.callAttempts} failed`)
            // Add markers that mapGeminiError will recognize
            if (state.errorCause === "RATE_LIMITED") {
              ;(error as { message: string }).message = "429 resource_exhausted"
            } else if (state.errorCause === "INVALID_IMAGE") {
              ;(error as { message: string }).message = "invalid_argument: invalid image"
            }
            throw error
          }
          // Return successful response
          return {
            response: {
              candidates: [
                {
                  content: {
                    parts: [
                      {
                        inlineData: {
                          data: Buffer.from("success").toString("base64"),
                          mimeType: "image/png",
                        },
                      },
                    ],
                  },
                },
              ],
            },
          }
        }),
      })),
    })),
    IMAGEN_MODEL: "gemini-test-model",
    SAFETY_SETTINGS: [],
    GENERATION_CONFIG: {},
    DEFAULT_IMAGE_CONFIG: {},
    bufferToBase64: (buffer: Buffer) => buffer.toString("base64"),
    inferMimeType: () => "image/jpeg",
  }
})

// Mock Sentry module
vi.mock("../lib/sentry-effect", () => ({
  addEffectBreadcrumb: vi.fn(() => Effect.void),
  captureEffectError: vi.fn(() => Effect.void),
}))

// Mock env to ensure Gemini is "configured"
vi.mock("../lib/env", () => ({
  env: { NODE_ENV: "test", GEMINI_API_KEY: "test-key" },
  isGeminiConfigured: () => true,
}))

// Import mocked functions for assertions
import { addEffectBreadcrumb, captureEffectError } from "../lib/sentry-effect"

// =============================================================================
// Test Helpers
// =============================================================================

interface CapturedEvent {
  event: string
  distinctId: string
  properties?: Record<string, unknown>
}

/**
 * Create a mock PostHogService that captures events for verification.
 */
function createMockPostHogService() {
  const capturedEvents: CapturedEvent[] = []

  const mockService = Layer.succeed(PostHogService, {
    capture: (event: string, distinctId: string, properties?: Record<string, unknown>) =>
      Effect.sync(() => {
        capturedEvents.push({ event, distinctId, properties })
      }),
    identify: () => Effect.void,
    shutdown: () => Effect.void,
  })

  return { layer: mockService, getCapturedEvents: () => capturedEvents }
}

/**
 * Configure mock Gemini client to fail N times then succeed.
 */
function configureGeminiMock(failCount: number, errorCause: GeminiError["cause"] = "RATE_LIMITED") {
  globalThis.__geminiMockState = {
    callAttempts: 0,
    shouldFailCount: failCount,
    errorCause,
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("GeminiService Retry Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Reset mock state
    globalThis.__geminiMockState = {
      callAttempts: 0,
      shouldFailCount: 0,
      errorCause: "RATE_LIMITED",
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("PostHog Analytics (AC-5)", () => {
    it("should fire gemini_retry event on each retry", async () => {
      const { layer: posthogLayer, getCapturedEvents } = createMockPostHogService()
      configureGeminiMock(2) // Fail 2 times, succeed on 3rd

      const program = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImage(Buffer.from("test"), "test prompt", {
          uploadId: "test-upload-123",
        })
      }).pipe(Effect.provide(GeminiServiceLive), Effect.provide(posthogLayer))

      const resultPromise = Effect.runPromise(program)
      await vi.advanceTimersByTimeAsync(10000)
      await resultPromise

      const events = getCapturedEvents()
      const retryEvents = events.filter((e) => e.event === "gemini_retry")

      // Should have 2 retry events (after 1st and 2nd failures)
      expect(retryEvents.length).toBe(2)

      // Verify event properties
      expect(retryEvents[0]?.properties?.upload_id).toBe("test-upload-123")
      expect(retryEvents[0]?.properties?.error_type).toBe("RATE_LIMITED")
    })

    it("should fire gemini_exhausted when all retries fail", async () => {
      const { layer: posthogLayer, getCapturedEvents } = createMockPostHogService()
      configureGeminiMock(10) // Always fail (more than max retries)

      const program = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImage(Buffer.from("test"), "test prompt", {
          uploadId: "exhaust-test",
        })
      }).pipe(Effect.provide(GeminiServiceLive), Effect.provide(posthogLayer), Effect.either)

      const resultPromise = Effect.runPromise(program)
      await vi.advanceTimersByTimeAsync(60000)
      await resultPromise

      const events = getCapturedEvents()
      const exhaustedEvents = events.filter((e) => e.event === "gemini_exhausted")

      expect(exhaustedEvents.length).toBe(1)
      expect(exhaustedEvents[0]?.properties?.upload_id).toBe("exhaust-test")
      expect(exhaustedEvents[0]?.properties?.total_attempts).toBeGreaterThan(1)
    })

    it("should NOT fire gemini_exhausted for non-retryable errors", async () => {
      const { layer: posthogLayer, getCapturedEvents } = createMockPostHogService()
      configureGeminiMock(1, "INVALID_IMAGE")

      const program = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImage(Buffer.from("test"), "test prompt")
      }).pipe(Effect.provide(GeminiServiceLive), Effect.provide(posthogLayer), Effect.either)

      await Effect.runPromise(program)

      const events = getCapturedEvents()
      const exhaustedEvents = events.filter((e) => e.event === "gemini_exhausted")
      const retryEvents = events.filter((e) => e.event === "gemini_retry")

      // No retries or exhaustion for non-retryable errors
      expect(exhaustedEvents.length).toBe(0)
      expect(retryEvents.length).toBe(0)
    })
  })

  describe("Sentry Breadcrumbs (AC-4)", () => {
    it("should add breadcrumb on each retry attempt", async () => {
      const { layer: posthogLayer } = createMockPostHogService()
      configureGeminiMock(2) // Fail 2 times, succeed on 3rd

      const program = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImage(Buffer.from("test"), "test prompt")
      }).pipe(Effect.provide(GeminiServiceLive), Effect.provide(posthogLayer))

      const resultPromise = Effect.runPromise(program)
      await vi.advanceTimersByTimeAsync(10000)
      await resultPromise

      // Verify breadcrumb was called for each retry
      expect(addEffectBreadcrumb).toHaveBeenCalled()

      // Check call arguments include retry context
      const calls = vi.mocked(addEffectBreadcrumb).mock.calls
      expect(calls.length).toBeGreaterThan(0)

      // First retry breadcrumb should have attempt info
      const firstCall = calls[0]
      expect(firstCall?.[0]).toContain("retry attempt")
      expect(firstCall?.[1]).toBe("gemini")
    })

    it("should capture error to Sentry on final failure", async () => {
      const { layer: posthogLayer } = createMockPostHogService()
      configureGeminiMock(10) // Always fail

      const program = Effect.gen(function* () {
        const gemini = yield* GeminiService
        return yield* gemini.generateImage(Buffer.from("test"), "test prompt")
      }).pipe(Effect.provide(GeminiServiceLive), Effect.provide(posthogLayer), Effect.either)

      const resultPromise = Effect.runPromise(program)
      await vi.advanceTimersByTimeAsync(60000)
      await resultPromise

      // Verify error was captured to Sentry
      expect(captureEffectError).toHaveBeenCalled()

      // Check error context
      const calls = vi.mocked(captureEffectError).mock.calls
      expect(calls.length).toBeGreaterThan(0)

      const lastCall = calls[calls.length - 1]
      expect(lastCall?.[1]?.service).toBe("gemini")
    })
  })
})
