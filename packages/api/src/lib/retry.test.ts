/**
 * Retry Schedule Tests
 *
 * Tests for exponential backoff retry schedules.
 * Tests verify ACTUAL schedule behavior, not simplified mocks.
 *
 * @see Story 4.3 - Retry Logic with Exponential Backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Effect, Schedule } from "effect"
import { geminiRetrySchedule, geminiRetryScheduleExact } from "./retry"
import { GeminiError, isRetryableGeminiError } from "./errors"

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a failing effect that tracks attempts and timestamps.
 */
function createFailingEffect(
  cause: GeminiError["cause"],
  maxAttempts: number = Infinity
) {
  const attempts: number[] = []
  let attemptCount = 0

  const effect = Effect.gen(function* () {
    attemptCount++
    attempts.push(Date.now())
    if (attemptCount >= maxAttempts) {
      return "success"
    }
    return yield* Effect.fail(
      new GeminiError({ cause, message: `Attempt ${attemptCount} failed` })
    )
  })

  return { effect, getAttempts: () => attempts, getCount: () => attemptCount }
}

// =============================================================================
// geminiRetrySchedule Tests (with jitter)
// =============================================================================

describe("geminiRetrySchedule", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should retry up to 3 times (4 total attempts) using actual schedule", async () => {
    const { effect, getCount } = createFailingEffect("RATE_LIMITED")

    const program = effect.pipe(
      Effect.retry(geminiRetrySchedule.pipe(
        Schedule.whileInput(isRetryableGeminiError)
      )),
      Effect.either
    )

    const resultPromise = Effect.runPromise(program)

    // Fast-forward through all delays (1s + 2s + 4s = 7s, plus buffer for jitter)
    await vi.advanceTimersByTimeAsync(10000)

    const result = await resultPromise

    // Should have 4 attempts (1 initial + 3 retries)
    expect(getCount()).toBe(4)
    expect(result._tag).toBe("Left")
  })

  it("should succeed after retry and stop retrying", async () => {
    const { effect, getCount } = createFailingEffect("API_ERROR", 3) // Succeed on 3rd attempt

    const program = effect.pipe(
      Effect.retry(geminiRetrySchedule.pipe(
        Schedule.whileInput(isRetryableGeminiError)
      ))
    )

    const resultPromise = Effect.runPromise(program)
    await vi.advanceTimersByTimeAsync(5000)
    const result = await resultPromise

    expect(getCount()).toBe(3)
    expect(result).toBe("success")
  })

  it("should NOT retry on INVALID_IMAGE (non-retryable)", async () => {
    const { effect, getCount } = createFailingEffect("INVALID_IMAGE")

    const program = effect.pipe(
      Effect.retry(geminiRetrySchedule.pipe(
        Schedule.whileInput(isRetryableGeminiError)
      )),
      Effect.either
    )

    const result = await Effect.runPromise(program)

    // Should only attempt once - schedule predicate rejects non-retryable
    expect(getCount()).toBe(1)
    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left.cause).toBe("INVALID_IMAGE")
    }
  })

  it("should NOT retry on CONTENT_POLICY (non-retryable)", async () => {
    const { effect, getCount } = createFailingEffect("CONTENT_POLICY")

    const program = effect.pipe(
      Effect.retry(geminiRetrySchedule.pipe(
        Schedule.whileInput(isRetryableGeminiError)
      )),
      Effect.either
    )

    const result = await Effect.runPromise(program)

    expect(getCount()).toBe(1)
    expect(result._tag).toBe("Left")
  })

  it("should retry on TIMEOUT errors", async () => {
    const { effect, getCount } = createFailingEffect("TIMEOUT", 2) // Succeed on 2nd attempt

    const program = effect.pipe(
      Effect.retry(geminiRetrySchedule.pipe(
        Schedule.whileInput(isRetryableGeminiError)
      ))
    )

    const resultPromise = Effect.runPromise(program)
    await vi.advanceTimersByTimeAsync(3000)
    const result = await resultPromise

    expect(getCount()).toBe(2)
    expect(result).toBe("success")
  })
})

// =============================================================================
// geminiRetryScheduleExact Tests (deterministic delays for verification)
// =============================================================================

describe("geminiRetryScheduleExact", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should have exactly 3 delays: 1s, 2s, 4s", async () => {
    const timestamps: number[] = []
    let attemptCount = 0

    const trackingEffect = Effect.gen(function* () {
      attemptCount++
      timestamps.push(Date.now())
      return yield* Effect.fail(
        new GeminiError({ cause: "RATE_LIMITED", message: "fail" })
      )
    })

    const program = trackingEffect.pipe(
      Effect.retry(geminiRetryScheduleExact),
      Effect.either
    )

    const resultPromise = Effect.runPromise(program)

    // Advance through each delay
    await vi.advanceTimersByTimeAsync(1000) // After 1s delay
    await vi.advanceTimersByTimeAsync(2000) // After 2s delay
    await vi.advanceTimersByTimeAsync(4000) // After 4s delay

    await resultPromise

    // Should have 4 attempts
    expect(attemptCount).toBe(4)

    // Verify delays between attempts
    const delays: number[] = []
    for (let i = 1; i < timestamps.length; i++) {
      const prev = timestamps[i - 1]
      const curr = timestamps[i]
      if (prev !== undefined && curr !== undefined) {
        delays.push(curr - prev)
      }
    }

    // Delays should be approximately 1000, 2000, 4000 ms
    expect(delays).toHaveLength(3)
    expect(delays[0]).toBe(1000)
    expect(delays[1]).toBe(2000)
    expect(delays[2]).toBe(4000)
  })

  it("should stop after 3 retries (4 total attempts)", async () => {
    let attemptCount = 0

    const failingEffect = Effect.gen(function* () {
      attemptCount++
      return yield* Effect.fail(
        new GeminiError({ cause: "API_ERROR", message: "always fail" })
      )
    })

    const program = failingEffect.pipe(
      Effect.retry(geminiRetryScheduleExact),
      Effect.either
    )

    const resultPromise = Effect.runPromise(program)
    await vi.advanceTimersByTimeAsync(10000)
    const result = await resultPromise

    expect(attemptCount).toBe(4) // 1 initial + 3 retries
    expect(result._tag).toBe("Left")
  })
})

// =============================================================================
// isRetryableGeminiError Tests
// =============================================================================

describe("isRetryableGeminiError", () => {
  it("returns true for RATE_LIMITED", () => {
    const error = new GeminiError({ cause: "RATE_LIMITED", message: "test" })
    expect(isRetryableGeminiError(error)).toBe(true)
  })

  it("returns true for API_ERROR", () => {
    const error = new GeminiError({ cause: "API_ERROR", message: "test" })
    expect(isRetryableGeminiError(error)).toBe(true)
  })

  it("returns true for TIMEOUT", () => {
    const error = new GeminiError({ cause: "TIMEOUT", message: "test" })
    expect(isRetryableGeminiError(error)).toBe(true)
  })

  it("returns false for INVALID_IMAGE", () => {
    const error = new GeminiError({ cause: "INVALID_IMAGE", message: "test" })
    expect(isRetryableGeminiError(error)).toBe(false)
  })

  it("returns false for CONTENT_POLICY", () => {
    const error = new GeminiError({ cause: "CONTENT_POLICY", message: "test" })
    expect(isRetryableGeminiError(error)).toBe(false)
  })
})
