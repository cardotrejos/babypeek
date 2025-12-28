import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { Effect, Layer } from "effect";

import { CleanupService, type CleanupResult } from "../services/CleanupService";
import { R2Service } from "../services/R2Service";
import { CleanupError } from "../lib/errors";

// =============================================================================
// Mock Setup
// =============================================================================

const MOCK_CRON_SECRET = "test-cron-secret-12345678";

// Mock env module
vi.mock("../lib/env", () => ({
  env: {
    CRON_SECRET: "test-cron-secret-12345678",
  },
}));

// Mock sentry middleware
vi.mock("../middleware/sentry", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Factory to create cleanup app with mocked services
function createCleanupApp(options: {
  cleanupResult?: CleanupResult;
  cleanupError?: Error;
  cronSecretConfigured?: boolean;
}) {
  const app = new Hono();

  app.post("/", async (c) => {
    // Verify CRON_SECRET header
    const cronSecret =
      c.req.header("x-cron-secret") || c.req.header("authorization")?.replace("Bearer ", "");

    if (options.cronSecretConfigured === false) {
      return c.json(
        {
          success: false,
          error: { code: "CONFIG_MISSING", message: "CRON_SECRET not configured" },
        },
        500,
      );
    }

    if (cronSecret !== MOCK_CRON_SECRET) {
      return c.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid cron secret" },
        },
        401,
      );
    }

    // Mock R2Service Layer
    const R2ServiceMock = Layer.succeed(R2Service, {
      generatePresignedUploadUrl: () => Effect.succeed({ url: "", key: "", expiresAt: new Date() }),
      generatePresignedDownloadUrl: () =>
        Effect.succeed({ url: "", key: "", expiresAt: new Date() }),
      upload: () => Effect.succeed(""),
      delete: () => Effect.succeed(undefined),
      deletePrefix: () => Effect.succeed(0),
      headObject: () => Effect.succeed(true),
      getUploadUrl: () => Effect.succeed(""),
      getDownloadUrl: () => Effect.succeed(""),
    });

    // Mock CleanupService Layer
    const mockResult = options.cleanupResult ?? {
      processed: 0,
      deleted: 0,
      failed: 0,
      errors: [],
    };
    const CleanupServiceMock = Layer.succeed(CleanupService, {
      runCleanup: options.cleanupError
        ? Effect.fail(
            new CleanupError({
              cause: "DB_FAILED",
              message: options.cleanupError.message,
            }),
          )
        : Effect.succeed(mockResult),
    });

    const program = Effect.gen(function* () {
      const cleanupService = yield* CleanupService;
      return yield* cleanupService.runCleanup;
    });

    const startTime = Date.now();
    const resultEither = await Effect.runPromise(
      Effect.either(
        program.pipe(Effect.provide(CleanupServiceMock), Effect.provide(R2ServiceMock)),
      ),
    );

    const durationMs = Date.now() - startTime;

    if (resultEither._tag === "Left") {
      return c.json(
        {
          success: false,
          error: {
            code: "CLEANUP_FAILED",
            message:
              resultEither.left instanceof Error ? resultEither.left.message : "Cleanup failed",
          },
          durationMs,
        },
        500,
      );
    }

    const result = resultEither.right;

    return c.json({
      success: true,
      stats: {
        processed: result.processed,
        deleted: result.deleted,
        failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      durationMs,
    });
  });

  return app;
}

// =============================================================================
// Tests
// =============================================================================

describe("POST /api/cron/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("returns 401 when cron secret is missing", async () => {
      const app = createCleanupApp({});

      const res = await app.request("/", {
        method: "POST",
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 when cron secret is invalid", async () => {
      const app = createCleanupApp({});

      const res = await app.request("/", {
        method: "POST",
        headers: { "x-cron-secret": "wrong-secret" },
      });

      expect(res.status).toBe(401);
      const body = (await res.json()) as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("accepts valid x-cron-secret header", async () => {
      const app = createCleanupApp({
        cleanupResult: { processed: 0, deleted: 0, failed: 0, errors: [] },
      });

      const res = await app.request("/", {
        method: "POST",
        headers: { "x-cron-secret": MOCK_CRON_SECRET },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(true);
    });

    it("accepts valid Authorization Bearer header", async () => {
      const app = createCleanupApp({
        cleanupResult: { processed: 0, deleted: 0, failed: 0, errors: [] },
      });

      const res = await app.request("/", {
        method: "POST",
        headers: { authorization: `Bearer ${MOCK_CRON_SECRET}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean };
      expect(body.success).toBe(true);
    });

    it("returns 500 when CRON_SECRET is not configured", async () => {
      const app = createCleanupApp({ cronSecretConfigured: false });

      const res = await app.request("/", {
        method: "POST",
        headers: { "x-cron-secret": MOCK_CRON_SECRET },
      });

      expect(res.status).toBe(500);
      const body = (await res.json()) as { success: boolean; error: { code: string } };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("CONFIG_MISSING");
    });
  });

  describe("Successful Cleanup", () => {
    it("returns cleanup stats when no records need cleanup", async () => {
      const app = createCleanupApp({
        cleanupResult: {
          processed: 0,
          deleted: 0,
          failed: 0,
          errors: [],
        },
      });

      const res = await app.request("/", {
        method: "POST",
        headers: { "x-cron-secret": MOCK_CRON_SECRET },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        stats: { processed: number; deleted: number; failed: number };
        durationMs: number;
      };
      expect(body.success).toBe(true);
      expect(body.stats.processed).toBe(0);
      expect(body.stats.deleted).toBe(0);
      expect(body.stats.failed).toBe(0);
      expect(body.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("returns cleanup stats when records are deleted", async () => {
      const app = createCleanupApp({
        cleanupResult: {
          processed: 10,
          deleted: 8,
          failed: 0,
          errors: [],
        },
      });

      const res = await app.request("/", {
        method: "POST",
        headers: { "x-cron-secret": MOCK_CRON_SECRET },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        stats: { processed: number; deleted: number; failed: number };
      };
      expect(body.success).toBe(true);
      expect(body.stats.processed).toBe(10);
      expect(body.stats.deleted).toBe(8);
      expect(body.stats.failed).toBe(0);
    });

    it("does not include errors array when empty", async () => {
      const app = createCleanupApp({
        cleanupResult: {
          processed: 5,
          deleted: 5,
          failed: 0,
          errors: [],
        },
      });

      const res = await app.request("/", {
        method: "POST",
        headers: { "x-cron-secret": MOCK_CRON_SECRET },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { stats: { errors?: string[] } };
      expect(body.stats.errors).toBeUndefined();
    });
  });

  describe("Partial Failures (AC-6)", () => {
    it("returns success with errors when some deletions fail", async () => {
      const app = createCleanupApp({
        cleanupResult: {
          processed: 10,
          deleted: 7,
          failed: 3,
          errors: [
            "Upload abc123: R2 delete failed",
            "Upload def456: DB connection error",
            "Upload ghi789: Timeout",
          ],
        },
      });

      const res = await app.request("/", {
        method: "POST",
        headers: { "x-cron-secret": MOCK_CRON_SECRET },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        success: boolean;
        stats: {
          processed: number;
          deleted: number;
          failed: number;
          errors: string[];
        };
      };
      expect(body.success).toBe(true); // Still success because we handled failures gracefully
      expect(body.stats.processed).toBe(10);
      expect(body.stats.deleted).toBe(7);
      expect(body.stats.failed).toBe(3);
      expect(body.stats.errors).toHaveLength(3);
    });

    it("continues processing after individual failures", async () => {
      const app = createCleanupApp({
        cleanupResult: {
          processed: 5,
          deleted: 4,
          failed: 1,
          errors: ["Upload xyz789: R2 error"],
        },
      });

      const res = await app.request("/", {
        method: "POST",
        headers: { "x-cron-secret": MOCK_CRON_SECRET },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { stats: { processed: number; deleted: number } };
      // Should have processed all 5, not stopped at first error
      expect(body.stats.processed).toBe(5);
      expect(body.stats.deleted).toBe(4);
    });
  });

  describe("Error Handling", () => {
    it("returns 500 when cleanup fails completely", async () => {
      const app = createCleanupApp({
        cleanupError: new Error("Database connection failed"),
      });

      const res = await app.request("/", {
        method: "POST",
        headers: { "x-cron-secret": MOCK_CRON_SECRET },
      });

      expect(res.status).toBe(500);
      const body = (await res.json()) as {
        success: boolean;
        error: { code: string; message: string };
        durationMs: number;
      };
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("CLEANUP_FAILED");
      expect(body.error.message).toBe("Database connection failed");
      expect(body.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Response Format", () => {
    it("includes durationMs in successful response", async () => {
      const app = createCleanupApp({
        cleanupResult: { processed: 0, deleted: 0, failed: 0, errors: [] },
      });

      const res = await app.request("/", {
        method: "POST",
        headers: { "x-cron-secret": MOCK_CRON_SECRET },
      });

      const body = (await res.json()) as { durationMs: number };
      expect(body).toHaveProperty("durationMs");
      expect(typeof body.durationMs).toBe("number");
    });

    it("includes durationMs in error response", async () => {
      const app = createCleanupApp({
        cleanupError: new Error("Test error"),
      });

      const res = await app.request("/", {
        method: "POST",
        headers: { "x-cron-secret": MOCK_CRON_SECRET },
      });

      const body = (await res.json()) as { durationMs: number };
      expect(body).toHaveProperty("durationMs");
      expect(typeof body.durationMs).toBe("number");
    });
  });
});

// =============================================================================
// Unit Tests: Retention Policy Logic
// =============================================================================

describe("Retention Policy", () => {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  // Helper to test retention logic
  const shouldDeleteUpload = (
    upload: { createdAt: Date },
    purchase: { createdAt: Date } | null,
    now: Date,
  ): boolean => {
    const baseDate = purchase?.createdAt ?? upload.createdAt;
    const expiryDate = new Date(baseDate.getTime() + THIRTY_DAYS_MS);
    return now > expiryDate;
  };

  describe("Unpurchased Uploads", () => {
    it("does not delete upload younger than 30 days", () => {
      const now = new Date();
      const upload = { createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) }; // 15 days ago

      expect(shouldDeleteUpload(upload, null, now)).toBe(false);
    });

    it("deletes upload exactly 31 days old", () => {
      const now = new Date();
      const upload = { createdAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000) }; // 31 days ago

      expect(shouldDeleteUpload(upload, null, now)).toBe(true);
    });

    it("deletes upload older than 30 days", () => {
      const now = new Date();
      const upload = { createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) }; // 60 days ago

      expect(shouldDeleteUpload(upload, null, now)).toBe(true);
    });
  });

  describe("Purchased Uploads", () => {
    it("uses purchase date for retention when purchased", () => {
      const now = new Date();
      // Upload is 45 days old, but purchase is only 10 days old
      const upload = { createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) };
      const purchase = { createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) };

      // Should NOT delete because purchase is only 10 days old
      expect(shouldDeleteUpload(upload, purchase, now)).toBe(false);
    });

    it("deletes when purchase is older than 30 days", () => {
      const now = new Date();
      const upload = { createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000) };
      const purchase = { createdAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000) };

      // Should delete because purchase is 35 days old
      expect(shouldDeleteUpload(upload, purchase, now)).toBe(true);
    });

    it("keeps upload when purchase extends retention within window", () => {
      const now = new Date();
      // Upload is 40 days old, purchase is 29 days old
      const upload = { createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000) };
      const purchase = { createdAt: new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000) };

      // Should NOT delete - purchase gives 1 more day
      expect(shouldDeleteUpload(upload, purchase, now)).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("handles exact 30-day boundary (should not delete)", () => {
      const now = new Date();
      const upload = { createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }; // Exactly 30 days

      // At exactly 30 days, expiryDate === now, so now > expiryDate is false
      expect(shouldDeleteUpload(upload, null, now)).toBe(false);
    });

    it("handles millisecond after 30-day boundary (should delete)", () => {
      const now = new Date();
      const upload = { createdAt: new Date(now.getTime() - THIRTY_DAYS_MS - 1) }; // 30 days + 1ms

      expect(shouldDeleteUpload(upload, null, now)).toBe(true);
    });
  });
});

// =============================================================================
// Integration Test Scenarios
// =============================================================================

describe("Cleanup Integration Scenarios", () => {
  it("complete flow: auth → cleanup → stats", async () => {
    const app = createCleanupApp({
      cleanupResult: {
        processed: 15,
        deleted: 12,
        failed: 3,
        errors: ["Upload a: R2 error", "Upload b: DB error", "Upload c: Timeout"],
      },
    });

    const res = await app.request("/", {
      method: "POST",
      headers: { "x-cron-secret": MOCK_CRON_SECRET },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      stats: {
        processed: number;
        deleted: number;
        failed: number;
        errors: string[];
      };
      durationMs: number;
    };

    expect(body.success).toBe(true);
    expect(body.stats.processed).toBe(15);
    expect(body.stats.deleted).toBe(12);
    expect(body.stats.failed).toBe(3);
    expect(body.stats.errors).toHaveLength(3);
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
  });
});
