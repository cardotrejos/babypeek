import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { Hono } from "hono"

import { rateLimitMiddleware } from "./rate-limit"
import { clearRateLimitStore, RATE_LIMIT_MAX_REQUESTS } from "../services/RateLimitService"

// =============================================================================
// Test Helpers
// =============================================================================

function createTestApp() {
  const app = new Hono()

  // Apply rate limiting
  app.use("*", rateLimitMiddleware())

  // Test endpoint
  app.post("/upload", (c) => c.json({ success: true }))

  return app
}

function createRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  })
}

// =============================================================================
// Tests
// =============================================================================

describe("rateLimitMiddleware", () => {
  beforeEach(() => {
    clearRateLimitStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("successful requests", () => {
    it("allows first request", async () => {
      const app = createTestApp()
      const res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))

      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean }
      expect(body.success).toBe(true)
    })

    it("allows 10 requests from same IP", async () => {
      const app = createTestApp()

      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        const res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))
        expect(res.status).toBe(200)
      }
    })

    it("allows requests from different IPs independently", async () => {
      const app = createTestApp()

      // Fill up IP1
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        await app.request(createRequest({ "x-forwarded-for": "1.1.1.1" }))
      }

      // IP2 should still work
      const res = await app.request(createRequest({ "x-forwarded-for": "2.2.2.2" }))
      expect(res.status).toBe(200)
    })
  })

  describe("rate limiting", () => {
    it("blocks 11th request with 429", async () => {
      const app = createTestApp()

      // Make 10 requests
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))
      }

      // 11th should fail
      const res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))

      expect(res.status).toBe(429)
    })

    it("returns correct error message", async () => {
      const app = createTestApp()

      // Fill up limit
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))
      }

      const res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))
      const body = (await res.json()) as { error: string; code: string; retryAfter: number }

      expect(body.error).toBe("You've reached the upload limit. Please try again later.")
      expect(body.code).toBe("RATE_LIMIT_EXCEEDED")
      expect(typeof body.retryAfter).toBe("number")
    })
  })

  describe("rate limit headers", () => {
    it("includes X-RateLimit-Limit header", async () => {
      const app = createTestApp()
      const res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))

      expect(res.headers.get("X-RateLimit-Limit")).toBe("10")
    })

    it("includes X-RateLimit-Remaining header", async () => {
      const app = createTestApp()
      const res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))

      expect(res.headers.get("X-RateLimit-Remaining")).toBe("9")
    })

    it("includes X-RateLimit-Reset header", async () => {
      const app = createTestApp()
      const res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))

      const resetHeader = res.headers.get("X-RateLimit-Reset")
      expect(resetHeader).toBeTruthy()
      expect(Number(resetHeader)).toBeGreaterThan(0)
    })

    it("decrements remaining count correctly", async () => {
      const app = createTestApp()

      for (let i = 0; i < 5; i++) {
        const res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))
        const remaining = Number(res.headers.get("X-RateLimit-Remaining"))
        expect(remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 1 - i)
      }
    })

    it("includes headers even on 429 response", async () => {
      const app = createTestApp()

      // Fill up limit
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))
      }

      // 429 response should still have headers
      const res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))

      expect(res.status).toBe(429)
      expect(res.headers.get("X-RateLimit-Limit")).toBe("10")
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0")
      expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy()
    })
  })

  describe("IP extraction", () => {
    it("extracts IP from x-forwarded-for", async () => {
      const app = createTestApp()

      // Use same IP via x-forwarded-for - should share rate limit
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))
      }

      const res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))
      expect(res.status).toBe(429)
    })

    it("extracts IP from cf-connecting-ip (priority)", async () => {
      const app = createTestApp()

      // cf-connecting-ip should take priority
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        await app.request(
          createRequest({
            "cf-connecting-ip": "5.5.5.5",
            "x-forwarded-for": "1.2.3.4", // Should be ignored
          })
        )
      }

      // Same cf-connecting-ip should be blocked
      const res = await app.request(
        createRequest({
          "cf-connecting-ip": "5.5.5.5",
          "x-forwarded-for": "9.9.9.9", // Different but should be ignored
        })
      )
      expect(res.status).toBe(429)
    })

    it("extracts first IP from x-forwarded-for chain", async () => {
      const app = createTestApp()

      // First IP in chain should be used
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        await app.request(
          createRequest({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" })
        )
      }

      // Same first IP should be blocked
      const res = await app.request(
        createRequest({ "x-forwarded-for": "1.1.1.1, 8.8.8.8" })
      )
      expect(res.status).toBe(429)
    })
  })

  describe("window reset", () => {
    it("allows requests after window expires", async () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const app = createTestApp()

      // Fill up limit
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))
      }

      // Verify blocked
      let res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))
      expect(res.status).toBe(429)

      // Advance time past window (1 hour + 1ms)
      vi.setSystemTime(now + 60 * 60 * 1000 + 1)

      // Should be allowed again
      res = await app.request(createRequest({ "x-forwarded-for": "1.2.3.4" }))
      expect(res.status).toBe(200)
    })
  })
})
