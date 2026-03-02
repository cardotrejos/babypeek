import type { Context, Next } from "hono";

/**
 * Simple in-memory per-user rate limiter.
 * Uses a sliding window approach keyed by userId.
 *
 * For production scale, swap the Map for Redis.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  /** Max requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export function rateLimit({ limit, windowMs }: RateLimitOptions) {
  return async function rateLimitMiddleware(c: Context, next: Next) {
    // Key by userId if authenticated, fall back to IP
    const user = c.get("user") as { id: string } | undefined;
    const ip = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";
    const key = user?.id ?? `ip:${ip}`;

    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      store.set(key, { count: 1, windowStart: now });
      return next();
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json(
        { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
        429,
      );
    }

    entry.count++;
    return next();
  };
}
