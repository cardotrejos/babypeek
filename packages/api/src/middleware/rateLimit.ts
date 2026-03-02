import type { Context, Next } from "hono";
import type { Ratelimit } from "@upstash/ratelimit";

/**
 * Rate limiter middleware.
 *
 * Uses @upstash/ratelimit backed by Redis when UPSTASH_REDIS_REST_URL +
 * UPSTASH_REDIS_REST_TOKEN are set (production on Vercel).
 *
 * Falls back to an in-memory sliding window for local development.
 * The in-memory store resets on cold starts — do NOT rely on it in production.
 */

// ── In-memory fallback (dev only) ────────────────────────────────────────────

interface MemEntry {
  count: number;
  windowStart: number;
}

const memStore = new Map<string, MemEntry>();

function memRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    memStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

// ── Upstash-backed limiter (production) ──────────────────────────────────────

// Each call to rateLimit() creates its own Upstash Ratelimit instance so that
// different limit/windowMs configurations are respected independently.
async function createUpstashLimiter(
  limit: number,
  windowMs: number,
): Promise<Ratelimit | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");

  const redis = new Redis({ url, token });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
    analytics: false,
  });
}

// ── Middleware factory ────────────────────────────────────────────────────────

interface RateLimitOptions {
  /** Max requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export function rateLimit({ limit, windowMs }: RateLimitOptions) {
  // Each factory call gets its own lazily-initialised Upstash instance,
  // ensuring limit/windowMs are never shared across different rateLimit() calls.
  let upstashLimiter: Ratelimit | null | undefined;

  return async function rateLimitMiddleware(c: Context, next: Next) {
    const user = c.get("user") as { id: string } | undefined;
    const ip = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";
    const key = user?.id ?? `ip:${ip}`;

    let allowed: boolean;

    if (upstashLimiter === undefined) {
      upstashLimiter = await createUpstashLimiter(limit, windowMs);
    }

    if (upstashLimiter) {
      const result = await upstashLimiter.limit(key);
      allowed = result.success;
    } else {
      allowed = memRateLimit(key, limit, windowMs);
    }

    if (!allowed) {
      return c.json(
        { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
        429,
      );
    }

    return next();
  };
}
