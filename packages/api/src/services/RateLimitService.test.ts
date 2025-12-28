import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { Effect } from "effect";

import {
  RateLimitService,
  RateLimitServiceLive,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  clearRateLimitStore,
} from "./RateLimitService";

// =============================================================================
// Test Helpers
// =============================================================================

const runEffect = <A>(effect: Effect.Effect<A, never, RateLimitService>) =>
  Effect.runPromise(Effect.provide(effect, RateLimitServiceLive));

// =============================================================================
// Tests
// =============================================================================

describe("RateLimitService", () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    clearRateLimitStore();
    // Use fake timers for time-based tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("check", () => {
    it("returns full availability when no requests made", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        return yield* service.check("test-ip-hash");
      });

      const result = await runEffect(program);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMIT_MAX_REQUESTS);
      expect(result.limit).toBe(RATE_LIMIT_MAX_REQUESTS);
    });

    it("does not increment counter", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        yield* service.check("test-ip");
        yield* service.check("test-ip");
        yield* service.check("test-ip");
        return yield* service.check("test-ip");
      });

      const result = await runEffect(program);

      // Should still be full since check doesn't increment
      expect(result.remaining).toBe(RATE_LIMIT_MAX_REQUESTS);
    });
  });

  describe("increment", () => {
    it("decrements remaining count on each call", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        const first = yield* service.increment("test-ip");
        const second = yield* service.increment("test-ip");
        const third = yield* service.increment("test-ip");
        return { first, second, third };
      });

      const { first, second, third } = await runEffect(program);

      expect(first.remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 1);
      expect(second.remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 2);
      expect(third.remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 3);
    });

    it("allows first 10 requests", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        const results = [];
        for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
          results.push(yield* service.increment("test-ip"));
        }
        return results;
      });

      const results = await runEffect(program);

      expect(results).toHaveLength(RATE_LIMIT_MAX_REQUESTS);
      results.forEach((result) => {
        expect(result.allowed).toBe(true);
      });
    });

    it("blocks 11th request with 429 equivalent", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        // Make 10 requests
        for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
          yield* service.increment("test-ip");
        }
        // 11th request should be blocked
        return yield* service.increment("test-ip");
      });

      const result = await runEffect(program);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("tracks different IPs separately", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        // Fill up IP1
        for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
          yield* service.increment("ip-1");
        }
        // IP2 should still be allowed
        return yield* service.increment("ip-2");
      });

      const result = await runEffect(program);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 1);
    });

    it("provides correct resetAt timestamp", async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        return yield* service.increment("test-ip");
      });

      const result = await runEffect(program);

      // resetAt should be approximately now + 1 hour (in seconds)
      const expectedReset = Math.floor((now + RATE_LIMIT_WINDOW_MS) / 1000);
      expect(result.resetAt).toBe(expectedReset);
    });
  });

  describe("window reset", () => {
    it("resets after window expires", async () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        // Fill up the limit
        for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
          yield* service.increment("test-ip");
        }
        return yield* service.increment("test-ip");
      });

      // First, fill up and verify blocked
      let result = await runEffect(program);
      expect(result.allowed).toBe(false);

      // Advance time past the window
      vi.setSystemTime(now + RATE_LIMIT_WINDOW_MS + 1);

      // Should be allowed again
      const newProgram = Effect.gen(function* () {
        const service = yield* RateLimitService;
        return yield* service.increment("test-ip");
      });

      result = await runEffect(newProgram);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 1);
    });
  });

  describe("reset", () => {
    it("clears rate limit for specific key", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        // Use up some requests
        for (let i = 0; i < 5; i++) {
          yield* service.increment("test-ip");
        }
        // Reset
        yield* service.reset("test-ip");
        // Check should show full availability
        return yield* service.check("test-ip");
      });

      const result = await runEffect(program);

      expect(result.remaining).toBe(RATE_LIMIT_MAX_REQUESTS);
    });

    it("only affects the specified key", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        // Use up requests for both IPs
        for (let i = 0; i < 5; i++) {
          yield* service.increment("ip-1");
          yield* service.increment("ip-2");
        }
        // Reset only ip-1
        yield* service.reset("ip-1");

        const ip1Result = yield* service.check("ip-1");
        const ip2Result = yield* service.check("ip-2");
        return { ip1Result, ip2Result };
      });

      const { ip1Result, ip2Result } = await runEffect(program);

      expect(ip1Result.remaining).toBe(RATE_LIMIT_MAX_REQUESTS);
      expect(ip2Result.remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 5);
    });
  });

  describe("getStoreSize", () => {
    it("returns 0 when no IPs tracked", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        return yield* service.getStoreSize();
      });

      const size = await runEffect(program);
      expect(size).toBe(0);
    });

    it("returns correct count of tracked IPs", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        yield* service.increment("ip-1");
        yield* service.increment("ip-2");
        yield* service.increment("ip-3");
        return yield* service.getStoreSize();
      });

      const size = await runEffect(program);
      expect(size).toBe(3);
    });
  });

  describe("rate limit headers values", () => {
    it("returns correct limit value", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitService;
        return yield* service.increment("test-ip");
      });

      const result = await runEffect(program);
      expect(result.limit).toBe(10);
    });
  });
});
