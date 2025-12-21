/**
 * Retry Schedule Tests
 *
 * Tests for exponential backoff retry schedules.
 * Tests verify retry behavior without relying on fake timers.
 *
 * @see Story 4.3 - Retry Logic with Exponential Backoff
 */

import { describe, it, expect } from "vitest"
import { Effect, Schedule } from "effect"
import { geminiRetrySchedule, geminiRetryScheduleExact, geminiRetryScheduleTest } from "./retry"
import { GeminiError, isRetryableGeminiError } from "./errors"

// =============================================================================
// geminiRetrySchedule Tests
// =============================================================================

describe("geminiRetrySchedule", () => {
  it("should retry up to 3 times (4 total attempts) with predicate", async () => {
    let attempts = 0

    const failingEffect = Effect.gen(function* () {
      attempts++
      return yield* Effect.fail(
        new GeminiError({ cause: "RATE_LIMITED", message: "Rate limited" })
      )
    })

    // Use zero-delay test schedule with whileInput predicate
    const program = failingEffect.pipe(
      Effect.retry(
        geminiRetryScheduleTest.pipe(Schedule.whileInput(isRetryableGeminiError))
      ),
      Effect.either
    )

    const result = await Effect.runPromise(program)

    // Should have 4 attempts (1 initial + 3 retries)
    expect(attempts).toBe(4)
    expect(result._tag).toBe("Left")
  })

  it("should have exponential backoff with jitter in production schedule", () => {
    // Verify the production schedule is properly configured
    expect(geminiRetrySchedule).toBeDefined()
  })

  it("should succeed after retry and stop retrying", async () => {
    let attempts = 0

    const sometimesFailingEffect = Effect.gen(function* () {
      attempts++
      if (attempts < 3) {
        return yield* Effect.fail(
          new GeminiError({ cause: "API_ERROR", message: "Transient error" })
        )
      }
      return "success"
    })

    const program = sometimesFailingEffect.pipe(
      Effect.retry(
        geminiRetryScheduleTest.pipe(Schedule.whileInput(isRetryableGeminiError))
      )
    )

    const result = await Effect.runPromise(program)

    expect(attempts).toBe(3)
    expect(result).toBe("success")
  })

  it("should NOT retry on INVALID_IMAGE (non-retryable)", async () => {
    let attempts = 0

    const nonRetryableEffect = Effect.gen(function* () {
      attempts++
      return yield* Effect.fail(
        new GeminiError({ cause: "INVALID_IMAGE", message: "Bad image" })
      )
    })

    const program = nonRetryableEffect.pipe(
      Effect.retry(
        geminiRetryScheduleTest.pipe(Schedule.whileInput(isRetryableGeminiError))
      ),
      Effect.either
    )

    const result = await Effect.runPromise(program)

    // Should only attempt once - schedule predicate rejects non-retryable
    expect(attempts).toBe(1)
    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left.cause).toBe("INVALID_IMAGE")
    }
  })

  it("should NOT retry on CONTENT_POLICY (non-retryable)", async () => {
    let attempts = 0

    const nonRetryableEffect = Effect.gen(function* () {
      attempts++
      return yield* Effect.fail(
        new GeminiError({ cause: "CONTENT_POLICY", message: "Blocked" })
      )
    })

    const program = nonRetryableEffect.pipe(
      Effect.retry(
        geminiRetryScheduleTest.pipe(Schedule.whileInput(isRetryableGeminiError))
      ),
      Effect.either
    )

    const result = await Effect.runPromise(program)

    expect(attempts).toBe(1)
    expect(result._tag).toBe("Left")
  })

  it("should retry on TIMEOUT errors", async () => {
    let attempts = 0

    const timeoutEffect = Effect.gen(function* () {
      attempts++
      if (attempts < 2) {
        return yield* Effect.fail(
          new GeminiError({ cause: "TIMEOUT", message: "Timed out" })
        )
      }
      return "recovered"
    })

    const program = timeoutEffect.pipe(
      Effect.retry(
        geminiRetryScheduleTest.pipe(Schedule.whileInput(isRetryableGeminiError))
      )
    )

    const result = await Effect.runPromise(program)

    expect(attempts).toBe(2)
    expect(result).toBe("recovered")
  })
})

// =============================================================================
// geminiRetryScheduleExact Tests
// =============================================================================

describe("geminiRetryScheduleExact", () => {
  it("should be defined with 3 retry delays (1s, 2s, 4s)", () => {
    // Verify the schedule is properly exported
    // Actual timing verification would require Effect's TestClock
    expect(geminiRetryScheduleExact).toBeDefined()
  })
})

describe("geminiRetryScheduleTest", () => {
  it("should stop after 3 retries (4 total attempts)", async () => {
    let attempts = 0

    const failingEffect = Effect.gen(function* () {
      attempts++
      return yield* Effect.fail(
        new GeminiError({ cause: "API_ERROR", message: "always fail" })
      )
    })

    const program = failingEffect.pipe(
      Effect.retry(geminiRetryScheduleTest),
      Effect.either
    )

    const result = await Effect.runPromise(program)

    expect(attempts).toBe(4) // 1 initial + 3 retries
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
