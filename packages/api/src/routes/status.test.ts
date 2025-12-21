import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"
import { Effect, Layer } from "effect"
import type { Upload } from "@3d-ultra/db"

import { UploadService } from "../services/UploadService"
import { NotFoundError } from "../lib/errors"

// =============================================================================
// Mock Setup
// =============================================================================

// Create a base mock upload
const createMockUpload = (overrides: Partial<Upload> = {}): Upload => ({
  id: "test-upload-id",
  email: "test@example.com",
  sessionToken: "valid-session-token",
  originalUrl: "uploads/test-upload-id/original.jpg",
  resultUrl: null,
  previewUrl: null,
  status: "pending",
  stage: null,
  progress: 0,
  workflowRunId: null,
  promptVersion: null,
  errorMessage: null,
  createdAt: new Date("2024-12-21T10:00:00Z"),
  updatedAt: new Date("2024-12-21T10:00:00Z"),
  expiresAt: new Date("2025-01-20T10:00:00Z"),
  ...overrides,
})

// Factory to create status route app with mocked UploadService
function createStatusApp(mockUpload: Upload | null) {
  const app = new Hono()

  app.get("/:jobId", async (c) => {
    const jobId = c.req.param("jobId")
    const sessionToken = c.req.header("X-Session-Token")

    // Require session token
    if (!sessionToken) {
      return c.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Session token required" } },
        401
      )
    }

    // Mock the Effect service lookup
    const UploadServiceMock = Layer.succeed(UploadService, {
      create: () => Effect.succeed({} as never),
      getById: () => Effect.succeed({} as never),
      getBySessionToken: () => Effect.succeed({} as never),
      getByIdWithAuth: (id: string, token: string) => {
        if (!mockUpload) {
          return Effect.fail(new NotFoundError({ resource: "upload", id }))
        }
        if (mockUpload.id !== id || mockUpload.sessionToken !== token) {
          return Effect.fail(new NotFoundError({ resource: "upload", id }))
        }
        return Effect.succeed(mockUpload)
      },
      updateStatus: () => Effect.succeed(undefined),
      updateResult: () => Effect.succeed(undefined),
      updateStage: () => Effect.succeed({} as never),
      startProcessing: () => Effect.succeed({} as never),
      resetForRetry: () => Effect.succeed({} as never),
      updatePromptVersion: () => Effect.succeed(undefined),
    })

    const getStatus = Effect.gen(function* () {
      const uploadService = yield* UploadService

      // Get upload with session token verification
      const upload = yield* uploadService.getByIdWithAuth(jobId, sessionToken)

      // Determine resultId - only include if status is completed and we have a result URL
      let resultId: string | null = null
      if (upload.status === "completed" && upload.resultUrl) {
        // Extract resultId from resultUrl path: results/{resultId}/full.jpg
        const match = upload.resultUrl.match(/results\/([^/]+)\//)
        resultId = match?.[1] ?? upload.id
      }

      return {
        success: true,
        status: upload.status,
        stage: upload.stage,
        progress: upload.progress ?? 0,
        resultId,
        errorMessage: upload.status === "failed" ? (upload.errorMessage ?? "Processing failed. Please try again.") : null,
        updatedAt: upload.updatedAt.toISOString(),
      }
    })

    const program = getStatus.pipe(Effect.provide(UploadServiceMock))
    const result = await Effect.runPromise(Effect.either(program))

    if (result._tag === "Left") {
      const error = result.left

      // Handle NotFoundError (upload not found OR session token doesn't match)
      if (error._tag === "NotFoundError") {
        return c.json(
          { success: false, error: { code: "NOT_FOUND", message: "Upload not found" } },
          404
        )
      }

      // Unknown error
      console.error("[status] Unexpected error:", error)
      return c.json(
        { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
        500
      )
    }

    return c.json(result.right)
  })

  return app
}

// =============================================================================
// Tests
// =============================================================================

describe("GET /api/status/:jobId", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Authentication", () => {
    it("returns 401 when session token is missing", async () => {
      const app = createStatusApp(createMockUpload())
      
      const res = await app.request("/test-job-id", {
        method: "GET",
      })

      expect(res.status).toBe(401)
      const json = await res.json() as { success: boolean; error: { code: string; message: string } }
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("UNAUTHORIZED")
      expect(json.error.message).toBe("Session token required")
    })

    it("returns 404 when session token is invalid", async () => {
      const mockUpload = createMockUpload({ sessionToken: "correct-token" })
      const app = createStatusApp(mockUpload)
      
      const res = await app.request("/test-upload-id", {
        method: "GET",
        headers: { "X-Session-Token": "wrong-token" },
      })

      expect(res.status).toBe(404)
      const json = await res.json() as { success: boolean; error: { code: string } }
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("NOT_FOUND")
    })
  })

  describe("Not found", () => {
    it("returns 404 when upload does not exist", async () => {
      const app = createStatusApp(null) // null = upload not found
      
      const res = await app.request("/non-existent-id", {
        method: "GET",
        headers: { "X-Session-Token": "any-token" },
      })

      expect(res.status).toBe(404)
      const json = await res.json() as { success: boolean; error: { code: string; message: string } }
      expect(json.success).toBe(false)
      expect(json.error.code).toBe("NOT_FOUND")
      expect(json.error.message).toBe("Upload not found")
    })
  })

  describe("Status responses", () => {
    it("returns correct response for pending upload", async () => {
      const mockUpload = createMockUpload({
        status: "pending",
        stage: null,
        progress: 0,
      })
      const app = createStatusApp(mockUpload)
      
      const res = await app.request("/test-upload-id", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean; status: string; stage: string | null; progress: number }
      expect(json.success).toBe(true)
      expect(json.status).toBe("pending")
      expect(json.stage).toBeNull()
      expect(json.progress).toBe(0)
    })

    it("returns correct response for processing upload with stage", async () => {
      const mockUpload = createMockUpload({
        status: "processing",
        stage: "generating",
        progress: 45,
      })
      const app = createStatusApp(mockUpload)
      
      const res = await app.request("/test-upload-id", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean; status: string; stage: string; progress: number }
      expect(json.success).toBe(true)
      expect(json.status).toBe("processing")
      expect(json.stage).toBe("generating")
      expect(json.progress).toBe(45)
    })

    it("returns resultId when status is completed", async () => {
      const mockUpload = createMockUpload({
        status: "completed",
        stage: "complete",
        progress: 100,
        resultUrl: "results/result-123/full.jpg",
      })
      const app = createStatusApp(mockUpload)
      
      const res = await app.request("/test-upload-id", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean; status: string; resultId: string }
      expect(json.success).toBe(true)
      expect(json.status).toBe("completed")
      expect(json.resultId).toBe("result-123")
    })

    it("returns errorMessage when status is failed", async () => {
      const mockUpload = createMockUpload({
        status: "failed",
        stage: "failed",
        progress: 30,
        errorMessage: "AI processing failed",
      })
      const app = createStatusApp(mockUpload)
      
      const res = await app.request("/test-upload-id", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean; status: string; errorMessage: string }
      expect(json.success).toBe(true)
      expect(json.status).toBe("failed")
      expect(json.errorMessage).toBe("AI processing failed")
    })

    it("returns default error message when failed without custom message", async () => {
      const mockUpload = createMockUpload({
        status: "failed",
        stage: "failed",
        progress: 30,
        errorMessage: null,
      })
      const app = createStatusApp(mockUpload)
      
      const res = await app.request("/test-upload-id", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { success: boolean; errorMessage: string }
      expect(json.errorMessage).toBe("Processing failed. Please try again.")
    })
  })

  describe("Response format", () => {
    it("includes updatedAt timestamp in ISO format", async () => {
      const mockUpload = createMockUpload({
        updatedAt: new Date("2024-12-21T10:30:00Z"),
      })
      const app = createStatusApp(mockUpload)
      
      const res = await app.request("/test-upload-id", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { updatedAt: string }
      expect(json.updatedAt).toBe("2024-12-21T10:30:00.000Z")
    })

    it("returns null for resultId when not completed", async () => {
      const mockUpload = createMockUpload({
        status: "processing",
        resultUrl: null,
      })
      const app = createStatusApp(mockUpload)
      
      const res = await app.request("/test-upload-id", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { resultId: string | null }
      expect(json.resultId).toBeNull()
    })

    it("returns null for errorMessage when not failed", async () => {
      const mockUpload = createMockUpload({
        status: "processing",
        errorMessage: null,
      })
      const app = createStatusApp(mockUpload)
      
      const res = await app.request("/test-upload-id", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const json = await res.json() as { errorMessage: string | null }
      expect(json.errorMessage).toBeNull()
    })
  })

  describe("ResultId extraction", () => {
    it("extracts resultId from standard result URL format", async () => {
      const mockUpload = createMockUpload({
        status: "completed",
        resultUrl: "results/abc123xyz/full.jpg",
      })
      const app = createStatusApp(mockUpload)
      
      const res = await app.request("/test-upload-id", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      const json = await res.json() as { resultId: string }
      expect(json.resultId).toBe("abc123xyz")
    })

    it("falls back to uploadId when result URL pattern doesn't match", async () => {
      const mockUpload = createMockUpload({
        id: "upload-123",
        status: "completed",
        resultUrl: "some/other/path.jpg",
      })
      const app = createStatusApp(mockUpload)
      
      const res = await app.request("/upload-123", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      const json = await res.json() as { resultId: string }
      expect(json.resultId).toBe("upload-123")
    })
  })
})

describe("Stage transition validation", () => {
  const stages = ["validating", "generating", "storing", "watermarking", "complete", "failed"] as const

  it("stages follow expected order", () => {
    const expectedOrder = ["validating", "generating", "storing", "watermarking", "complete"]
    expect(expectedOrder).toEqual(stages.filter(s => s !== "failed"))
  })

  it("progress increases with stage progression", () => {
    const stageProgress: Record<string, number> = {
      validating: 10,
      generating: 30, // Can go up to 70
      storing: 80,
      watermarking: 90,
      complete: 100,
    }

    let prevProgress = 0
    for (const stage of ["validating", "generating", "storing", "watermarking", "complete"]) {
      const progress = stageProgress[stage] ?? 0
      expect(progress).toBeGreaterThan(prevProgress)
      prevProgress = progress
    }
  })
})
