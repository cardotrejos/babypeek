import type { Context, Next } from "hono";

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
    return true; // allowed
  }

  if (entry.count >= limit) return false; // blocked

  entry.count++;
  return true; // allowed
}

// ── Upstash-backed limiter (production) ──────────────────────────────────────

let upstashLimiter: ((key: string) => Promise<{ success: boolean }>) | null = null;

async function getUpstashLimiter(limit: number, windowMs: number) {
  if (upstashLimiter) return upstashLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const { Redis } = await import("@upstash/redis");
  const { Ratelimit } = await import("@upstash/ratelimit");

  const redis = new Redis({ url, token });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
    analytics: false,
  });

  upstashLimiter = (key: string) => ratelimit.limit(key);
  return upstashLimiter;
}

// ── Middleware factory ────────────────────────────────────────────────────────

interface RateLimitOptions {
  /** Max requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export function rateLimit({ limit, windowMs }: RateLimitOptions) {
  return async function rateLimitMiddleware(c: Context, next: Next) {
    const user = c.get("user") as { id: string } | undefined;
    const ip = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown";
    const key = user?.id ?? `ip:${ip}`;

    let allowed: boolean;

    const upstash = await getUpstashLimiter(limit, windowMs);
    if (upstash) {
      const result = await upstash(key);
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
