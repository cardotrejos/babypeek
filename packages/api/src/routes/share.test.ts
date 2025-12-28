import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { db } from "@babypeek/db";

// Mock database
vi.mock("@babypeek/db", () => ({
  db: {
    query: {
      uploads: {
        findFirst: vi.fn(),
      },
    },
  },
  uploads: { id: "id" },
}));

// Import the actual route
import shareRoutes from "./share";

describe("Share Routes - Story 6.7", () => {
  const app = new Hono();
  app.route("/api/share", shareRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/share/:shareId", () => {
    it("should return share data for completed upload", async () => {
      // Arrange
      const mockUpload = {
        id: "upload_123",
        email: "test@example.com",
        status: "completed",
        previewUrl: "https://r2.example.com/preview/upload_123.jpg",
        resultUrl: "https://r2.example.com/result/upload_123.jpg",
        sessionToken: "secret_token",
      };
      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(mockUpload);

      // Act
      const res = await app.request("/api/share/upload_123");
      const body = await res.json();

      // Assert
      expect(res.status).toBe(200);
      expect(body).toEqual({
        shareId: "upload_123",
        uploadId: "upload_123",
        previewUrl: "https://r2.example.com/preview/upload_123.jpg",
      });
      // Should NOT include sensitive data
      expect(body).not.toHaveProperty("email");
      expect(body).not.toHaveProperty("sessionToken");
      expect(body).not.toHaveProperty("resultUrl");
    });

    it("should return 404 for non-existent upload", async () => {
      // Arrange
      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(undefined);

      // Act
      const res = await app.request("/api/share/nonexistent");

      // Assert
      expect(res.status).toBe(404);
    });

    it("should return 404 for non-completed upload", async () => {
      // Arrange
      const mockUpload = {
        id: "upload_123",
        email: "test@example.com",
        status: "processing", // Not completed
        previewUrl: null,
        resultUrl: null,
      };
      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(mockUpload);

      // Act
      const res = await app.request("/api/share/upload_123");

      // Assert
      expect(res.status).toBe(404);
    });

    it("should return 404 for upload without preview URL", async () => {
      // Arrange
      const mockUpload = {
        id: "upload_123",
        email: "test@example.com",
        status: "completed",
        previewUrl: null, // No preview
        resultUrl: "https://r2.example.com/result/upload_123.jpg",
      };
      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(mockUpload);

      // Act
      const res = await app.request("/api/share/upload_123");

      // Assert
      expect(res.status).toBe(404);
    });

    it("should not expose PII (email, sessionToken)", async () => {
      // Arrange
      const mockUpload = {
        id: "upload_secret",
        email: "private@email.com",
        sessionToken: "super_secret_token",
        status: "completed",
        previewUrl: "https://r2.example.com/preview.jpg",
        resultUrl: "https://r2.example.com/result/private.jpg",
      };
      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(mockUpload);

      // Act
      const res = await app.request("/api/share/upload_secret");
      const body = await res.json();
      const bodyString = JSON.stringify(body);

      // Assert - no PII in response
      expect(bodyString).not.toContain("private@email.com");
      expect(bodyString).not.toContain("super_secret_token");
      expect(bodyString).not.toContain("result/private.jpg");
    });
  });
});
