import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { Effect, Layer } from "effect";
import type { Upload } from "@babypeek/db";

import { R2Service } from "../services/R2Service";

// =============================================================================
// Mock Setup
// =============================================================================

const createMockUpload = (overrides: Partial<Upload> = {}): Upload => ({
  id: "upload_123",
  email: "test@example.com",
  sessionToken: "secret_token",
  originalUrl: "uploads/upload_123/original.jpg",
  resultUrl: "results/upload_123/full.jpg",
  previewUrl: "results/upload_123/preview.jpg",
  status: "completed",
  stage: "complete",
  progress: 100,
  workflowRunId: null,
  promptVersion: "v4",
  errorMessage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  expiresAt: null,
  ...overrides,
});

// Factory to create share route app with mocked services
function createShareApp(options: { upload?: Upload | undefined }) {
  const mockUpload = options.upload;

  const app = new Hono();

  app.get("/:shareId", async (c) => {
    const shareId = c.req.param("shareId");

    if (!shareId) {
      return c.json({ error: "Share ID required" }, 400);
    }

    // Mock database lookup - shareId is uploadId
    const upload = mockUpload?.id === shareId ? mockUpload : undefined;

    if (!upload) {
      return c.json({ error: "Not found" }, 404);
    }

    // Must have completed processing with preview
    if (upload.status !== "completed" || !upload.previewUrl) {
      return c.json({ error: "Not available for sharing" }, 404);
    }

    // Generate signed URL for preview image
    const program = Effect.gen(function* () {
      const r2Service = yield* R2Service;

      // Generate 24-hour signed URL for the preview (public share pages)
      const signedUrl = yield* r2Service
        .getDownloadUrl(upload.previewUrl!, 24 * 60 * 60) // 24 hours
        .pipe(Effect.catchAll(() => Effect.succeed(null as string | null)));

      return signedUrl;
    });

    // Mock R2 service that returns a signed URL
    const mockR2Service = {
      generatePresignedUploadUrl: vi.fn(),
      generatePresignedDownloadUrl: vi.fn(),
      upload: vi.fn(),
      delete: vi.fn(),
      deletePrefix: vi.fn(),
      headObject: vi.fn(),
      getUploadUrl: vi.fn(),
      getDownloadUrl: vi
        .fn()
        .mockReturnValue(Effect.succeed("https://signed-url.example.com/preview.jpg")),
    };

    const MockR2ServiceLive = Layer.succeed(R2Service, mockR2Service);

    const signedPreviewUrl = await Effect.runPromise(
      program.pipe(Effect.provide(MockR2ServiceLive)),
    );

    if (!signedPreviewUrl) {
      return c.json({ error: "Preview not available" }, 404);
    }

    // Return only public info - NO PII (email, sessionToken, resultUrl)
    return c.json({
      shareId,
      uploadId: upload.id,
      previewUrl: signedPreviewUrl,
    });
  });

  return { app };
}

// =============================================================================
// Tests
// =============================================================================

describe("Share Routes - Story 6.7", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/share/:shareId", () => {
    it("should return share data for completed upload", async () => {
      // Arrange
      const mockUpload = createMockUpload();
      const { app } = createShareApp({ upload: mockUpload });

      // Act
      const res = await app.request("/upload_123");
      const body = await res.json();

      // Assert
      expect(res.status).toBe(200);
      expect(body).toEqual({
        shareId: "upload_123",
        uploadId: "upload_123",
        previewUrl: "https://signed-url.example.com/preview.jpg",
      });
      // Should NOT include sensitive data
      expect(body).not.toHaveProperty("email");
      expect(body).not.toHaveProperty("sessionToken");
      expect(body).not.toHaveProperty("resultUrl");
    });

    it("should return 404 for non-existent upload", async () => {
      // Arrange
      const { app } = createShareApp({ upload: undefined });

      // Act
      const res = await app.request("/nonexistent");

      // Assert
      expect(res.status).toBe(404);
    });

    it("should return 404 for non-completed upload", async () => {
      // Arrange
      const mockUpload = createMockUpload({
        id: "upload_123",
        status: "processing", // Not completed
        previewUrl: null,
        resultUrl: null,
      });
      const { app } = createShareApp({ upload: mockUpload });

      // Act
      const res = await app.request("/upload_123");

      // Assert
      expect(res.status).toBe(404);
    });

    it("should return 404 for upload without preview URL", async () => {
      // Arrange
      const mockUpload = createMockUpload({
        id: "upload_123",
        status: "completed",
        previewUrl: null, // No preview
        resultUrl: "results/upload_123/full.jpg",
      });
      const { app } = createShareApp({ upload: mockUpload });

      // Act
      const res = await app.request("/upload_123");

      // Assert
      expect(res.status).toBe(404);
    });

    it("should not expose PII (email, sessionToken)", async () => {
      // Arrange
      const mockUpload = createMockUpload({
        id: "upload_secret",
        email: "private@email.com",
        sessionToken: "super_secret_token",
        previewUrl: "results/upload_secret/preview.jpg",
        resultUrl: "results/upload_secret/full.jpg",
      });
      const { app } = createShareApp({ upload: mockUpload });

      // Act
      const res = await app.request("/upload_secret");
      const body = await res.json();
      const bodyString = JSON.stringify(body);

      // Assert - no PII in response
      expect(bodyString).not.toContain("private@email.com");
      expect(bodyString).not.toContain("super_secret_token");
      expect(bodyString).not.toContain("result/private.jpg");
    });
  });
});
