import type { Context, Next } from "hono"
import { Effect } from "effect"

import { getClientIP, hashIP, isPrivateIP } from "../lib/ip"
import { RateLimitService, RateLimitServiceLive } from "../services/RateLimitService"
import { env } from "../lib/env"

// =============================================================================
// Types
// =============================================================================

interface RateLimitConfig {
  /** Whether to skip rate limiting (for development bypass) */
  skipRateLimiting?: boolean
}

// =============================================================================
// Rate Limit Headers
// =============================================================================

/**
 * Set standard rate limit headers on response
 */
function setRateLimitHeaders(
  c: Context,
  limit: number,
  remaining: number,
  resetAt: number
): void {
  c.header("X-RateLimit-Limit", limit.toString())
  c.header("X-RateLimit-Remaining", remaining.toString())
  c.header("X-RateLimit-Reset", resetAt.toString())
}

// =============================================================================
// Rate Limit Middleware Factory
// =============================================================================

/**
 * Create a rate limiting middleware for Hono
 * 
 * Features:
 * - IP-based rate limiting using X-Forwarded-For, CF-Connecting-IP, etc.
 * - Returns 429 status with friendly error message when limit exceeded
 * - Adds standard rate limit headers to all responses
 * - Supports development bypass via X-RateLimit-Bypass header
 * 
 * @example
 * ```ts
 * import { rateLimitMiddleware } from "./middleware/rate-limit"
 * 
 * app.use("/api/upload/*", rateLimitMiddleware())
 * ```
 */
export function rateLimitMiddleware(config: RateLimitConfig = {}) {
  return async (c: Context, next: Next) => {
    // Development bypass check (uses process.env directly since this is a security token)
    const bypassToken = c.req.header("x-ratelimit-bypass")
    const expectedToken = process.env.RATE_LIMIT_BYPASS_TOKEN

    if (env.NODE_ENV === "development" && bypassToken && expectedToken && bypassToken === expectedToken) {
      // Bypass rate limiting in development with correct token
      await next()
      return
    }

    // Skip if explicitly configured
    if (config.skipRateLimiting) {
      await next()
      return
    }

    // Extract client IP
    const ip = getClientIP(c)

    // Skip rate limiting for private/internal IPs (localhost, 10.x.x.x, etc.)
    if (isPrivateIP(ip)) {
      await next()
      return
    }

    // Hash IP for privacy-safe rate limiting
    const ipHash = hashIP(ip)

    // Create Effect program for rate limit check
    const checkRateLimit = Effect.gen(function* () {
      const service = yield* RateLimitService
      return yield* service.increment(ipHash)
    })

    // Run the Effect and get result
    const result = await Effect.runPromise(
      Effect.provide(checkRateLimit, RateLimitServiceLive)
    )

    // Always set rate limit headers (even on 429)
    setRateLimitHeaders(c, result.limit, result.remaining, result.resetAt)

    // Check if rate limited
    if (!result.allowed) {
      const retryAfterSeconds = Math.max(0, result.resetAt - Math.floor(Date.now() / 1000))

      // Set Retry-After header (RFC 7231 standard)
      c.header("Retry-After", retryAfterSeconds.toString())

      return c.json(
        {
          error: "You've reached the upload limit. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: retryAfterSeconds,
        },
        429
      )
    }

    // Continue to next handler
    await next()
  }
}

// =============================================================================
// Standalone Rate Limit Check (for use in Effects)
// =============================================================================

/**
 * Check rate limit for an IP hash
 * Returns the rate limit result without blocking
 */
export function checkRateLimitForIP(ipHash: string) {
  return Effect.gen(function* () {
    const service = yield* RateLimitService
    return yield* service.check(ipHash)
  })
}

/**
 * Increment rate limit for an IP hash
 * Returns the rate limit result after incrementing
 */
export function incrementRateLimitForIP(ipHash: string) {
  return Effect.gen(function* () {
    const service = yield* RateLimitService
    return yield* service.increment(ipHash)
  })
}
