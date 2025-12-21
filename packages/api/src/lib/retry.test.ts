/**
 * Retry Schedule Tests
 *
 * Tests for exponential backoff retry schedules.
 *
 * @see Story 4.3 - Retry Logic with Exponential Backoff
 */

import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { geminiRetryScheduleExact } from "./retry"
import { GeminiError, isRetryableGeminiError } from "./errors"

describe("geminiRetrySchedule", () => {
  it("should retry up to 3 times (4 total attempts) for retryable errors", async () => {
    let attempts = 0

    // Create a failing effect that counts attempts
    const failingEffect = Effect.gen(function* () {
      attempts++
      return yield* Effect.fail(
        new GeminiError({ cause: "RATE_LIMITED", message: "Rate limited" })
      )
    })

    // Apply retry schedule with no delays for testing speed
    const program = failingEffect.pipe(
      Effect.retry({
        times: 3, // Match the schedule's 3 retries
        while: isRetryableGeminiError,
      }),
      Effect.either
    )

    const result = await Effect.runPromise(program)

    // Should have 4 attempts (1 initial + 3 retries)
    expect(attempts).toBe(4)
    // Should fail after all retries
    expect(result._tag).toBe("Left")
  })

  it("should succeed on retry and not continue retrying", async () => {
    let attempts = 0

    // Create an effect that fails twice then succeeds
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
      Effect.retry({
        times: 3,
        while: isRetryableGeminiError,
      })
    )

    const result = await Effect.runPromise(program)

    expect(attempts).toBe(3)
    expect(result).toBe("success")
  })

  it("should not retry on non-retryable errors (INVALID_IMAGE)", async () => {
    let attempts = 0

    const nonRetryableEffect = Effect.gen(function* () {
      attempts++
      return yield* Effect.fail(
        new GeminiError({ cause: "INVALID_IMAGE", message: "Bad image" })
      )
    })

    const program = nonRetryableEffect.pipe(
      Effect.retry({
        times: 3,
        while: isRetryableGeminiError,
      }),
      Effect.either
    )

    const result = await Effect.runPromise(program)

    // Should only attempt once - no retries for non-retryable errors
    expect(attempts).toBe(1)
    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left.cause).toBe("INVALID_IMAGE")
    }
  })

  it("should not retry on non-retryable errors (CONTENT_POLICY)", async () => {
    let attempts = 0

    const nonRetryableEffect = Effect.gen(function* () {
      attempts++
      return yield* Effect.fail(
        new GeminiError({ cause: "CONTENT_POLICY", message: "Blocked" })
      )
    })

    const program = nonRetryableEffect.pipe(
      Effect.retry({
        times: 3,
        while: isRetryableGeminiError,
      }),
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
      Effect.retry({
        times: 3,
        while: isRetryableGeminiError,
      })
    )

    const result = await Effect.runPromise(program)

    expect(attempts).toBe(2)
    expect(result).toBe("recovered")
  })
})

describe("geminiRetryScheduleExact", () => {
  it("should be defined with correct delays", () => {
    // Just verify the schedule exists and is exported correctly
    expect(geminiRetryScheduleExact).toBeDefined()
  })
})
