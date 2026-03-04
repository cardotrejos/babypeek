import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Hono } from "hono";

import { rateLimit } from "./rateLimit";

describe("rateLimit middleware", () => {
  const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (originalUpstashUrl === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL;
    } else {
      process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
    }

    if (originalUpstashToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
    }
  });

  it("isolates in-memory counters per middleware instance", async () => {
    const app = new Hono();

    app.use(
      "/first",
      rateLimit({
        limit: 1,
        windowMs: 60_000,
        keyGenerator: () => "shared-key",
      }),
    );
    app.use(
      "/second",
      rateLimit({
        limit: 1,
        windowMs: 60_000,
        keyGenerator: () => "shared-key",
      }),
    );

    app.get("/first", (c) => c.json({ ok: true }));
    app.get("/second", (c) => c.json({ ok: true }));

    const firstRouteFirstRequest = await app.request("/first");
    const secondRouteFirstRequest = await app.request("/second");

    expect(firstRouteFirstRequest.status).toBe(200);
    expect(secondRouteFirstRequest.status).toBe(200);

    const firstRouteSecondRequest = await app.request("/first");
    const secondRouteSecondRequest = await app.request("/second");

    expect(firstRouteSecondRequest.status).toBe(429);
    expect(secondRouteSecondRequest.status).toBe(429);
  });

  it("still enforces limits within a single middleware instance", async () => {
    const app = new Hono();

    app.use(
      "/limited",
      rateLimit({
        limit: 2,
        windowMs: 60_000,
        keyGenerator: () => "single-route-key",
      }),
    );

    app.get("/limited", (c) => c.json({ ok: true }));

    const first = await app.request("/limited");
    const second = await app.request("/limited");
    const third = await app.request("/limited");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
  });
});
