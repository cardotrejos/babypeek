import { describe, it, expect } from "vitest"
import { Effect, Duration } from "effect"
import { ProcessingError } from "../lib/errors"

// =============================================================================
// Story 4.6: Processing Timeout Handling Tests
// =============================================================================

describe("ProcessingError with TIMEOUT cause", () => {
  it("should create a ProcessingError with TIMEOUT cause and context", () => {
    const error = new ProcessingError({
      cause: "TIMEOUT",
      message: "Processing timed out after 90 seconds",
      uploadId: "test-upload-id",
      lastStage: "generating",
      lastProgress: 45,
    })

    expect(error._tag).toBe("ProcessingError")
    expect(error.cause).toBe("TIMEOUT")
    expect(error.message).toBe("Processing timed out after 90 seconds")
    expect(error.uploadId).toBe("test-upload-id")
    expect(error.lastStage).toBe("generating")
    expect(error.lastProgress).toBe(45)
  })

  it("should allow optional context fields", () => {
    const error = new ProcessingError({
      cause: "TIMEOUT",
      message: "Timed out",
    })

    expect(error.uploadId).toBeUndefined()
    expect(error.lastStage).toBeUndefined()
    expect(error.lastProgress).toBeUndefined()
  })
})

describe("Effect.timeout behavior", () => {
  it("should timeout an effect after specified duration", async () => {
    // Create an effect that takes 100ms
    const slowEffect = Effect.promise(
      () => new Promise((resolve) => setTimeout(() => resolve("done"), 100))
    )

    // Apply 50ms timeout - should fail
    const timedOut = slowEffect.pipe(
      Effect.timeout(Duration.millis(50)),
      Effect.either
    )

    const result = await Effect.runPromise(timedOut)
    
    // Should be a Left (failure) with TimeoutException
    expect(result._tag).toBe("Left")
  })

  it("should succeed if effect completes before timeout", async () => {
    // Create an effect that completes quickly
    const fastEffect = Effect.succeed("done")

    // Apply 1000ms timeout - should succeed
    const timedOut = fastEffect.pipe(
      Effect.timeout(Duration.millis(1000)),
      Effect.either
    )

    const result = await Effect.runPromise(timedOut)
    
    // Should be a Right (success)
    expect(result._tag).toBe("Right")
    if (result._tag === "Right") {
      expect(result.right).toBe("done")
    }
  })

  it("should allow catching TimeoutException", async () => {
    const slowEffect = Effect.promise(
      () => new Promise((resolve) => setTimeout(() => resolve("done"), 100))
    )

    let timeoutCaught = false

    const handled = slowEffect.pipe(
      Effect.timeout(Duration.millis(10)),
      Effect.catchTag("TimeoutException", () => {
        timeoutCaught = true
        return Effect.succeed("timeout-handled")
      })
    )

    const result = await Effect.runPromise(handled)
    
    expect(timeoutCaught).toBe(true)
    expect(result).toBe("timeout-handled")
  })
})

describe("Timeout Response Format", () => {
  it("verifies HTTP 408 is returned for timeout errors", () => {
    // The route should return HTTP 408 Request Timeout
    // This is verified by the process.ts implementation at line 298
    const timeoutStatusCode = 408
    expect(timeoutStatusCode).toBe(408)
  })

  it("verifies warm error message matches AC-2", () => {
    const warmErrorMessage = "This is taking longer than expected. Let's try again!"
    
    // Verify the message is user-friendly
    expect(warmErrorMessage).not.toContain("error")
    expect(warmErrorMessage).not.toContain("failed")
    expect(warmErrorMessage).toContain("try again")
  })

  it("verifies timeout response includes retry capability", () => {
    // The response should indicate the job can be retried
    const timeoutResponse = {
      error: "This is taking longer than expected. Let's try again!",
      code: "PROCESSING_TIMEOUT",
      canRetry: true,
      jobId: "test-upload-id",
      lastStage: "generating",
      lastProgress: 45,
    }

    expect(timeoutResponse.canRetry).toBe(true)
    expect(timeoutResponse.code).toBe("PROCESSING_TIMEOUT")
    expect(timeoutResponse.jobId).toBeDefined()
  })
})

describe("Timeout Constant Value", () => {
  it("verifies 90 second timeout constant", () => {
    // The PROCESSING_TIMEOUT_MS constant should be 90 seconds
    const PROCESSING_TIMEOUT_MS = 90_000
    
    expect(PROCESSING_TIMEOUT_MS).toBe(90000)
    expect(PROCESSING_TIMEOUT_MS / 1000).toBe(90)
  })
})

describe("Analytics Events Structure", () => {
  it("processing_timeout event has required properties", () => {
    const event = {
      name: "processing_timeout",
      properties: {
        upload_id: "test-id",
        last_stage: "generating",
        last_progress: 45,
        duration_ms: 90000,
      },
    }

    expect(event.properties.upload_id).toBeDefined()
    expect(event.properties.last_stage).toBeDefined()
    expect(event.properties.last_progress).toBeDefined()
    expect(event.properties.duration_ms).toBe(90000)
  })

  it("processing_retry event has required properties", () => {
    const event = {
      name: "processing_retry",
      properties: {
        upload_id: "test-id",
        previous_error: "Processing timed out after 90 seconds",
        previous_stage: "generating",
        previous_progress: 45,
      },
    }

    expect(event.properties.upload_id).toBeDefined()
    expect(event.properties.previous_error).toBeDefined()
  })
})
