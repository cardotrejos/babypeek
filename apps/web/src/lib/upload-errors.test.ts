import { describe, it, expect } from "vitest"

import { categorizeError, getErrorMessage, isRetryable, type UploadErrorType } from "./upload-errors"

describe("Upload Error Categorization", () => {
  describe("categorizeError", () => {
    describe("TypeError (network errors)", () => {
      it("should categorize fetch failure as NETWORK", () => {
        const error = new TypeError("Failed to fetch")
        const result = categorizeError(error)

        expect(result.type).toBe("NETWORK")
        expect(result.retryable).toBe(true)
        expect(result.userMessage).toContain("offline")
      })

      it("should categorize network error as NETWORK", () => {
        const error = new TypeError("network error")
        const result = categorizeError(error)

        expect(result.type).toBe("NETWORK")
        expect(result.retryable).toBe(true)
      })
    })

    describe("Response objects", () => {
      it("should categorize 429 as RATE_LIMIT", () => {
        const response = new Response(null, { 
          status: 429,
          headers: { "Retry-After": "3600" }
        })
        const result = categorizeError(response)

        expect(result.type).toBe("RATE_LIMIT")
        expect(result.retryable).toBe(true)
        expect(result.retryAfter).toBe(3600)
      })

      it("should categorize 500 as SERVER", () => {
        const response = new Response(null, { status: 500 })
        const result = categorizeError(response)

        expect(result.type).toBe("SERVER")
        expect(result.retryable).toBe(true)
      })

      it("should categorize 502 as SERVER", () => {
        const response = new Response(null, { status: 502 })
        const result = categorizeError(response)

        expect(result.type).toBe("SERVER")
        expect(result.retryable).toBe(true)
      })

      it("should categorize 503 as SERVER", () => {
        const response = new Response(null, { status: 503 })
        const result = categorizeError(response)

        expect(result.type).toBe("SERVER")
        expect(result.retryable).toBe(true)
      })

      it("should categorize 401 as UNAUTHORIZED", () => {
        const response = new Response(null, { status: 401 })
        const result = categorizeError(response)

        expect(result.type).toBe("UNAUTHORIZED")
        expect(result.retryable).toBe(false)
      })

      it("should categorize 403 as UNAUTHORIZED", () => {
        const response = new Response(null, { status: 403 })
        const result = categorizeError(response)

        expect(result.type).toBe("UNAUTHORIZED")
        expect(result.retryable).toBe(false)
      })

      it("should categorize 404 as NOT_FOUND", () => {
        const response = new Response(null, { status: 404 })
        const result = categorizeError(response)

        expect(result.type).toBe("NOT_FOUND")
        expect(result.retryable).toBe(false)
      })

      it("should categorize 400 as VALIDATION", () => {
        const response = new Response(null, { status: 400 })
        const result = categorizeError(response)

        expect(result.type).toBe("VALIDATION")
        expect(result.retryable).toBe(false)
      })
    })

    describe("Error objects", () => {
      it("should categorize timeout error", () => {
        const error = new Error("Upload timed out")
        const result = categorizeError(error)

        expect(result.type).toBe("TIMEOUT")
        expect(result.retryable).toBe(true)
      })

      it("should categorize network error", () => {
        const error = new Error("Network error during upload")
        const result = categorizeError(error)

        expect(result.type).toBe("NETWORK")
        expect(result.retryable).toBe(true)
      })

      it("should categorize cancellation", () => {
        const error = new Error("Upload cancelled")
        const result = categorizeError(error)

        expect(result.type).toBe("CANCELLED")
        expect(result.retryable).toBe(false)
      })

      it("should categorize abort error", () => {
        const error = new Error("aborted")
        const result = categorizeError(error)

        expect(result.type).toBe("CANCELLED")
        expect(result.retryable).toBe(false)
      })

      it("should categorize server error message", () => {
        const error = new Error("Server error: 500")
        const result = categorizeError(error)

        expect(result.type).toBe("SERVER")
        expect(result.retryable).toBe(true)
      })

      it("should categorize rate limit message", () => {
        const error = new Error("Rate limit exceeded")
        const result = categorizeError(error)

        expect(result.type).toBe("RATE_LIMIT")
        expect(result.retryable).toBe(true)
      })

      it("should default to UNKNOWN for unrecognized errors", () => {
        const error = new Error("Something weird happened")
        const result = categorizeError(error)

        expect(result.type).toBe("UNKNOWN")
        expect(result.retryable).toBe(true)
      })
    })

    describe("String errors", () => {
      it("should categorize string network error", () => {
        const result = categorizeError("Connection failed")

        expect(result.type).toBe("NETWORK")
        expect(result.retryable).toBe(true)
      })

      it("should categorize string timeout error", () => {
        const result = categorizeError("Request timed out")

        expect(result.type).toBe("TIMEOUT")
        expect(result.retryable).toBe(true)
      })
    })

    describe("Unknown error types", () => {
      it("should handle null", () => {
        const result = categorizeError(null)

        expect(result.type).toBe("UNKNOWN")
        expect(result.retryable).toBe(true)
      })

      it("should handle undefined", () => {
        const result = categorizeError(undefined)

        expect(result.type).toBe("UNKNOWN")
        expect(result.retryable).toBe(true)
      })

      it("should handle objects", () => {
        const result = categorizeError({ foo: "bar" })

        expect(result.type).toBe("UNKNOWN")
        expect(result.retryable).toBe(true)
      })
    })
  })

  describe("getErrorMessage", () => {
    it("should return correct message for NETWORK", () => {
      expect(getErrorMessage("NETWORK")).toContain("offline")
    })

    it("should return correct message for TIMEOUT", () => {
      expect(getErrorMessage("TIMEOUT")).toContain("too long")
    })

    it("should return correct message for SERVER", () => {
      expect(getErrorMessage("SERVER")).toContain("our end")
    })

    it("should return correct message for RATE_LIMIT", () => {
      expect(getErrorMessage("RATE_LIMIT")).toContain("limit")
    })

    it("should return empty string for CANCELLED", () => {
      expect(getErrorMessage("CANCELLED")).toBe("")
    })
  })

  describe("isRetryable", () => {
    const retryableTypes: UploadErrorType[] = ["NETWORK", "TIMEOUT", "SERVER", "RATE_LIMIT", "UNKNOWN"]
    const nonRetryableTypes: UploadErrorType[] = ["VALIDATION", "UNAUTHORIZED", "NOT_FOUND", "CANCELLED"]

    it.each(retryableTypes)("should return true for %s", (type) => {
      expect(isRetryable(type)).toBe(true)
    })

    it.each(nonRetryableTypes)("should return false for %s", (type) => {
      expect(isRetryable(type)).toBe(false)
    })
  })

  describe("Rate limit message formatting", () => {
    it("should format short retry times as 'in a moment'", () => {
      const response = new Response(null, { 
        status: 429,
        headers: { "Retry-After": "30" }
      })
      const result = categorizeError(response)

      expect(result.userMessage).toContain("in a moment")
    })

    it("should format minutes correctly (singular)", () => {
      const response = new Response(null, { 
        status: 429,
        headers: { "Retry-After": "60" }
      })
      const result = categorizeError(response)

      expect(result.userMessage).toContain("1 minute")
    })

    it("should format minutes correctly (plural)", () => {
      const response = new Response(null, { 
        status: 429,
        headers: { "Retry-After": "300" }
      })
      const result = categorizeError(response)

      expect(result.userMessage).toContain("5 minutes")
    })
  })
})
