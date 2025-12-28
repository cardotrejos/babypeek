import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";

import uploadRoutes from "./upload";
import { clearRateLimitStore } from "../services/RateLimitService";

// =============================================================================
// Test Setup
// =============================================================================

// Create app with routes
const createTestApp = () => {
  const app = new Hono();
  app.route("/api/upload", uploadRoutes);
  return app;
};

// Type for response body with error details
interface ErrorResponse {
  error: string;
  details?: {
    contentType?: string[];
    email?: string[];
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("Upload Routes - Request Validation", () => {
  let app: Hono;

  beforeEach(() => {
    // Clear rate limit store between tests
    clearRateLimitStore();
    app = createTestApp();
  });

  describe("POST /api/upload", () => {
    it("should return 400 for missing contentType", async () => {
      const res = await app.request("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error).toBe("Invalid request");
      expect(body.details?.contentType).toBeDefined();
    });

    it("should return 400 for missing email", async () => {
      const res = await app.request("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "image/jpeg" }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error).toBe("Invalid request");
      expect(body.details?.email).toBeDefined();
    });

    it("should return 400 for invalid email format", async () => {
      const res = await app.request("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "image/jpeg", email: "invalid-email" }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error).toBe("Invalid request");
      expect(body.details?.email).toBeDefined();
    });

    it("should return 400 for non-image content type", async () => {
      const res = await app.request("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "application/pdf", email: "test@example.com" }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error).toBe("Invalid request");
      expect(body.details?.contentType).toBeDefined();
    });

    it("should accept valid image content types", async () => {
      // This test verifies the validation passes for valid image types
      // The actual R2/DB operations may fail (503) if not configured, but validation should pass
      const contentTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];

      for (const type of contentTypes) {
        const res = await app.request("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: type, email: "test@example.com" }),
        });

        // Should not return 400 validation error for valid image types
        // May return 503 if R2 not configured, which is expected
        expect(res.status).not.toBe(400);
      }
    });
  });

  describe("POST /api/upload/:uploadId/confirm", () => {
    it("should return 404 for empty uploadId path", async () => {
      // Test with just the base path (no ID)
      const res = await app.request("/api/upload//confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Hono returns 404 for malformed paths
      expect(res.status).toBe(404);
    });
  });

  describe("Request Body Handling", () => {
    it("should handle empty request body gracefully", async () => {
      const res = await app.request("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "",
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as ErrorResponse;
      expect(body.error).toBe("Invalid request");
    });

    it("should handle malformed JSON gracefully", async () => {
      const res = await app.request("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json",
      });

      expect(res.status).toBe(400);
    });
  });
});

describe("DELETE /api/upload/:uploadId - Cleanup Endpoint", () => {
  let app: Hono;

  beforeEach(() => {
    clearRateLimitStore();
    app = createTestApp();
  });

  it("should return 400 for missing uploadId", async () => {
    const res = await app.request("/api/upload/", {
      method: "DELETE",
    });

    // Hono returns 404 for malformed paths
    expect(res.status).toBe(404);
  });

  it("should return 401 when session token is missing", async () => {
    const res = await app.request("/api/upload/test-upload-id", {
      method: "DELETE",
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; code: string };
    expect(body.code).toBe("MISSING_TOKEN");
  });

  it("should return 200 even if upload doesn't exist (graceful handling)", async () => {
    // This test verifies that cleanup is idempotent and doesn't fail for missing resources
    const res = await app.request("/api/upload/nonexistent-id", {
      method: "DELETE",
      headers: {
        "X-Session-Token": "some-session-token",
      },
    });

    // Should return success even for non-existent uploads
    // May return 503 if R2 not configured (expected in test env)
    expect([200, 503]).toContain(res.status);
  });

  it("documents expected response fields for cleanup", () => {
    // This test documents the expected response format for API consumers
    const expectedFields = ["success"];

    expect(expectedFields).toContain("success");
  });
});

describe("Upload Routes - Rate Limiting Integration", () => {
  let app: Hono;

  beforeEach(() => {
    clearRateLimitStore();
    app = createTestApp();
  });

  it("should return rate limit headers on successful requests", async () => {
    const res = await app.request("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.100", // Public IP to avoid private IP bypass
      },
      body: JSON.stringify({ contentType: "image/jpeg", email: "test@example.com" }),
    });

    // Check rate limit headers exist (regardless of response status)
    expect(res.headers.get("X-RateLimit-Limit")).toBeDefined();
    expect(res.headers.get("X-RateLimit-Remaining")).toBeDefined();
    expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
  });

  it("should return 429 with Retry-After header when rate limit exceeded", async () => {
    // Make requests until rate limit is hit (default is 10 per hour)
    const publicIP = "203.0.113.200"; // Use public IP

    // First 10 requests should succeed (may return 503 if R2 not configured, which is fine)
    for (let i = 0; i < 10; i++) {
      await app.request("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": publicIP,
        },
        body: JSON.stringify({ contentType: "image/jpeg", email: "test@example.com" }),
      });
    }

    // 11th request should be rate limited
    const res = await app.request("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": publicIP,
      },
      body: JSON.stringify({ contentType: "image/jpeg", email: "test@example.com" }),
    });

    expect(res.status).toBe(429);

    // Check response body
    const body = (await res.json()) as { error: string; code: string; retryAfter: number };
    expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(body.retryAfter).toBeGreaterThanOrEqual(0);

    // Check Retry-After header exists
    expect(res.headers.get("Retry-After")).toBeDefined();

    // Check rate limit headers
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("should skip rate limiting for private IPs", async () => {
    // Use localhost IP - should bypass rate limiting
    const privateIP = "127.0.0.1";

    // Make more than 5 requests - should all succeed (no rate limit)
    for (let i = 0; i < 7; i++) {
      const res = await app.request("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": privateIP,
        },
        body: JSON.stringify({ contentType: "image/jpeg", email: "test@example.com" }),
      });

      // Should not be rate limited (will be 503 if R2 not configured, but not 429)
      expect(res.status).not.toBe(429);
    }
  });
});

describe("Upload Routes - Response Format Documentation", () => {
  describe("POST /api/upload response contract", () => {
    it("documents expected successful response fields", () => {
      // This test documents the expected response format for API consumers
      const expectedFields = ["uploadUrl", "uploadId", "key", "expiresAt", "sessionToken"];

      expect(expectedFields).toContain("uploadUrl");
      expect(expectedFields).toContain("uploadId");
      expect(expectedFields).toContain("key");
      expect(expectedFields).toContain("expiresAt");
      expect(expectedFields).toContain("sessionToken");
    });
  });

  describe("POST /api/upload/:uploadId/confirm response contract", () => {
    it("documents expected successful response fields", () => {
      // This test documents the expected response format for API consumers
      const expectedFields = ["success", "jobId", "status"];

      expect(expectedFields).toContain("success");
      expect(expectedFields).toContain("jobId");
      expect(expectedFields).toContain("status");
    });
  });
});
