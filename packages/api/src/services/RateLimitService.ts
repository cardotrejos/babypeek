import { Effect, Context, Layer } from "effect"

// =============================================================================
// Constants
// =============================================================================

/** Rate limit window: 1 hour in milliseconds */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

/** Maximum requests per window per IP */
export const RATE_LIMIT_MAX_REQUESTS = 10

// =============================================================================
// Types
// =============================================================================

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Remaining requests in the current window */
  remaining: number
  /** Unix timestamp (seconds) when the window resets */
  resetAt: number
  /** Total limit for the window */
  limit: number
}

interface RateLimitWindow {
  /** Number of requests made in this window */
  count: number
  /** Timestamp when this window started */
  windowStart: number
}

// =============================================================================
// In-Memory Store
// =============================================================================

/**
 * In-memory rate limit store
 * 
 * Note: This resets on cold starts. For production with multiple
 * function instances, consider using Redis (Upstash/Vercel KV).
 */
const rateLimitStore = new Map<string, RateLimitWindow>()

/**
 * Clear expired entries periodically to prevent memory leaks
 * Runs every 5 minutes
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

let cleanupInterval: ReturnType<typeof setInterval> | null = null

function startCleanupInterval() {
  if (cleanupInterval) return

  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, window] of rateLimitStore.entries()) {
      if (now - window.windowStart >= RATE_LIMIT_WINDOW_MS) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL_MS)

  // Don't prevent Node from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }
}

// Start cleanup on module load
startCleanupInterval()

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Rate Limit Service
 * 
 * Provides IP-based rate limiting using a sliding window algorithm.
 * Stores state in-memory (suitable for single-instance deployments).
 */
export class RateLimitService extends Context.Tag("RateLimitService")<
  RateLimitService,
  {
    /**
     * Check rate limit status without incrementing
     * Useful for preview/read operations
     */
    check: (key: string) => Effect.Effect<RateLimitResult, never>

    /**
     * Check and increment rate limit counter
     * Returns whether the request is allowed
     */
    increment: (key: string) => Effect.Effect<RateLimitResult, never>

    /**
     * Reset rate limit for a key (for testing/admin)
     */
    reset: (key: string) => Effect.Effect<void, never>

    /**
     * Get current store size (for monitoring)
     */
    getStoreSize: () => Effect.Effect<number, never>
  }
>() {}

// =============================================================================
// Implementation
// =============================================================================

const check = (key: string): Effect.Effect<RateLimitResult, never> =>
  Effect.sync(() => {
    const now = Date.now()
    const window = rateLimitStore.get(key)

    // No existing window - fully available
    if (!window) {
      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_REQUESTS,
        resetAt: Math.floor((now + RATE_LIMIT_WINDOW_MS) / 1000),
        limit: RATE_LIMIT_MAX_REQUESTS,
      }
    }

    // Check if window has expired
    if (now - window.windowStart >= RATE_LIMIT_WINDOW_MS) {
      // Window expired, would start fresh
      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_REQUESTS,
        resetAt: Math.floor((now + RATE_LIMIT_WINDOW_MS) / 1000),
        limit: RATE_LIMIT_MAX_REQUESTS,
      }
    }

    // Active window - calculate remaining
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - window.count)
    const resetAt = Math.floor((window.windowStart + RATE_LIMIT_WINDOW_MS) / 1000)

    return {
      allowed: remaining > 0,
      remaining,
      resetAt,
      limit: RATE_LIMIT_MAX_REQUESTS,
    }
  })

const increment = (key: string): Effect.Effect<RateLimitResult, never> =>
  Effect.sync(() => {
    const now = Date.now()
    const window = rateLimitStore.get(key)

    // No existing window - create new one
    if (!window) {
      rateLimitStore.set(key, { count: 1, windowStart: now })
      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_REQUESTS - 1,
        resetAt: Math.floor((now + RATE_LIMIT_WINDOW_MS) / 1000),
        limit: RATE_LIMIT_MAX_REQUESTS,
      }
    }

    // Check if window has expired
    if (now - window.windowStart >= RATE_LIMIT_WINDOW_MS) {
      // Start new window
      rateLimitStore.set(key, { count: 1, windowStart: now })
      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_REQUESTS - 1,
        resetAt: Math.floor((now + RATE_LIMIT_WINDOW_MS) / 1000),
        limit: RATE_LIMIT_MAX_REQUESTS,
      }
    }

    // Active window - check and increment
    const resetAt = Math.floor((window.windowStart + RATE_LIMIT_WINDOW_MS) / 1000)

    if (window.count >= RATE_LIMIT_MAX_REQUESTS) {
      // Rate limited - don't increment further
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit: RATE_LIMIT_MAX_REQUESTS,
      }
    }

    // Increment counter
    window.count++

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - window.count,
      resetAt,
      limit: RATE_LIMIT_MAX_REQUESTS,
    }
  })

const reset = (key: string): Effect.Effect<void, never> =>
  Effect.sync(() => {
    rateLimitStore.delete(key)
  })

const getStoreSize = (): Effect.Effect<number, never> =>
  Effect.sync(() => rateLimitStore.size)

// =============================================================================
// Layer
// =============================================================================

export const RateLimitServiceLive = Layer.succeed(RateLimitService, {
  check,
  increment,
  reset,
  getStoreSize,
})

// =============================================================================
// Testing Utilities
// =============================================================================

/**
 * Clear all rate limit data
 * Only exported for testing purposes
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear()
}

/**
 * Get raw store for testing inspection
 */
export function getRateLimitStore(): Map<string, RateLimitWindow> {
  return rateLimitStore
}
