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

function memRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = memStore.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    memStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((entry.windowStart + windowMs - now) / 1000));
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true, retryAfter: 0 };
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
  /**
   * Optional custom key resolver. Useful for pre-auth endpoints where user
   * context doesn't exist yet (for example, rate limiting by email).
   */
  keyGenerator?: (c: Context) => string | null | undefined | Promise<string | null | undefined>;
}

function getClientIp(c: Context): string {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return c.req.header("x-real-ip") ?? "unknown";
}

export function rateLimit({ limit, windowMs, keyGenerator }: RateLimitOptions) {
  // Each factory call gets its own lazily-initialised Upstash instance,
  // ensuring limit/windowMs are never shared across different rateLimit() calls.
  let upstashLimiter: Ratelimit | null | undefined;

  return async function rateLimitMiddleware(c: Context, next: Next) {
    const user = c.get("user") as { id: string } | undefined;
    let key = user?.id ? `user:${user.id}` : null;

    if (!key && keyGenerator) {
      try {
        const generated = await keyGenerator(c);
        if (typeof generated === "string" && generated.trim().length > 0) {
          key = generated.trim();
        }
      } catch {
        // Fall back to IP key when custom key generation fails.
      }
    }

    if (!key) {
      key = `ip:${getClientIp(c)}`;
    }

    let allowed: boolean;
    let retryAfter = 0;

    if (upstashLimiter === undefined) {
      upstashLimiter = await createUpstashLimiter(limit, windowMs);
    }

    if (upstashLimiter) {
      const result = await upstashLimiter.limit(key);
      allowed = result.success;
      if (!result.success) {
        const resetAt = typeof result.reset === "number" ? result.reset : Date.now() + windowMs;
        retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      }
    } else {
      const result = memRateLimit(key, limit, windowMs);
      allowed = result.allowed;
      retryAfter = result.retryAfter;
    }

    if (!allowed) {
      c.header("Retry-After", String(retryAfter));
      return c.json(
        {
          error: "Too many requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter,
        },
        429,
      );
    }

    return next();
  };
}
