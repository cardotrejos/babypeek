import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect, Layer } from "effect"
import { ResultService, ResultServiceLive, type CreateResultParams } from "./ResultService"
import { R2Service } from "./R2Service"
import { UploadService } from "./UploadService"
import { PostHogServiceMock } from "./PostHogService"
import { ResultError, NotFoundError, R2Error } from "../lib/errors"

// Mock the database module with proper promise chain
vi.mock("@babypeek/db", () => ({
  db: {
    query: {
      uploads: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: "test-upload-id" }])),
        })),
      })),
    })),
  },
  uploads: { id: "id" },
}))

// Mock env module
vi.mock("../lib/env", () => ({
  env: {
    NODE_ENV: "test",
  },
}))

describe("ResultService", () => {
  // Mock R2Service that succeeds
  const R2ServiceMock = Layer.succeed(R2Service, {
    upload: (key: string, _body: Buffer, _contentType: string) =>
      Effect.succeed(`https://bucket.r2.cloudflarestorage.com/${key}`),
    generatePresignedUploadUrl: () => Effect.succeed({ url: "https://upload.url", key: "key", expiresAt: new Date() }),
    generatePresignedDownloadUrl: () => Effect.succeed({ url: "https://download.url", key: "key", expiresAt: new Date() }),
    delete: () => Effect.succeed(undefined),
    deletePrefix: () => Effect.succeed(0),
    headObject: () => Effect.succeed(true),
    getUploadUrl: () => Effect.succeed("https://upload.url"),
    getDownloadUrl: () => Effect.succeed("https://download.url"),
  })

  // Mock R2Service that fails - returns R2Error which gets wrapped to ResultError
  const R2ServiceFailMock = Layer.succeed(R2Service, {
    upload: () =>
      Effect.fail(
        new R2Error({
          cause: "UPLOAD_FAILED",
          message: "R2 upload failed",
        })
      ),
    generatePresignedUploadUrl: () => Effect.succeed({ url: "https://upload.url", key: "key", expiresAt: new Date() }),
    generatePresignedDownloadUrl: () => Effect.succeed({ url: "https://download.url", key: "key", expiresAt: new Date() }),
    delete: () => Effect.succeed(undefined),
    deletePrefix: () => Effect.succeed(0),
    headObject: () => Effect.succeed(true),
    getUploadUrl: () => Effect.succeed("https://upload.url"),
    getDownloadUrl: () => Effect.succeed("https://download.url"),
  })

  // Mock UploadService
  const UploadServiceMock = Layer.succeed(UploadService, {
    create: () => Effect.succeed({} as never),
    getById: () => Effect.succeed({} as never),
    getBySessionToken: () => Effect.succeed({} as never),
    getByIdWithAuth: () => Effect.succeed({} as never),
    updateStatus: () => Effect.succeed(undefined),
    updateResult: () => Effect.succeed(undefined),
    updateStage: () => Effect.succeed({} as never),
    startProcessing: () => Effect.succeed({} as never),
    resetForRetry: () => Effect.succeed({} as never),
    updatePromptVersion: () => Effect.succeed(undefined),
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("create", () => {
    it("has correct service tag", () => {
      expect(ResultService.key).toBe("ResultService")
    })

    it("provides create method via ResultServiceLive", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ResultService
        return typeof service.create
      }).pipe(
        Effect.provide(ResultServiceLive),
        Effect.provide(R2ServiceMock),
        Effect.provide(UploadServiceMock),
        Effect.provide(PostHogServiceMock)
      )

      const result = await Effect.runPromise(program)
      expect(result).toBe("function")
    })

    it("creates result with R2 upload and updates upload record", async () => {
      const testParams: CreateResultParams = {
        uploadId: "test-upload-id",
        fullImageBuffer: Buffer.from("test-image-data"),
        mimeType: "image/jpeg",
      }

      const program = Effect.gen(function* () {
        const service = yield* ResultService
        return yield* service.create(testParams)
      }).pipe(
        Effect.provide(ResultServiceLive),
        Effect.provide(R2ServiceMock),
        Effect.provide(UploadServiceMock),
        Effect.provide(PostHogServiceMock)
      )

      const result = await Effect.runPromise(program)

      expect(result.resultId).toBeDefined()
      expect(result.uploadId).toBe("test-upload-id")
      expect(result.resultUrl).toContain("results/")
      expect(result.resultUrl).toContain("/full.jpg")
      expect(result.fileSizeBytes).toBe(testParams.fullImageBuffer.length)
    })

    it("fails with ResultError NOT_FOUND when uploadId doesn't exist", async () => {
      // Create a mock that returns empty array (simulating upload not found)
      const dbModule = await import("@babypeek/db")
      const originalUpdate = dbModule.db.update

      // Temporarily override update to return empty result
      ;(dbModule.db as { update: typeof originalUpdate }).update = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve([])), // Empty = not found
          })),
        })),
      })) as unknown as typeof originalUpdate

      const testParams: CreateResultParams = {
        uploadId: "non-existent-upload-id",
        fullImageBuffer: Buffer.from("test-image-data"),
      }

      const program = Effect.gen(function* () {
        const service = yield* ResultService
        return yield* service.create(testParams)
      }).pipe(
        Effect.provide(ResultServiceLive),
        Effect.provide(R2ServiceMock),
        Effect.provide(UploadServiceMock),
        Effect.provide(PostHogServiceMock)
      )

      const result = await Effect.runPromise(Effect.either(program))

      // Restore original
      ;(dbModule.db as { update: typeof originalUpdate }).update = originalUpdate

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ResultError)
        expect((result.left as ResultError).cause).toBe("NOT_FOUND")
      }
    })

    it("fails with ResultError when R2 upload fails", async () => {
      const testParams: CreateResultParams = {
        uploadId: "test-upload-id",
        fullImageBuffer: Buffer.from("test-image-data"),
      }

      const program = Effect.gen(function* () {
        const service = yield* ResultService
        return yield* service.create(testParams)
      }).pipe(
        Effect.provide(ResultServiceLive),
        Effect.provide(R2ServiceFailMock),
        Effect.provide(UploadServiceMock),
        Effect.provide(PostHogServiceMock)
      )

      const result = await Effect.runPromise(Effect.either(program))
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        // R2Error is wrapped in ResultError with cause STORAGE_FAILED
        expect(result.left).toBeInstanceOf(ResultError)
        expect((result.left as ResultError).cause).toBe("STORAGE_FAILED")
      }
    })

    it("generates unique resultId using cuid2", async () => {
      const testParams: CreateResultParams = {
        uploadId: "test-upload-id",
        fullImageBuffer: Buffer.from("test-image-data"),
      }

      const program = Effect.gen(function* () {
        const service = yield* ResultService
        const result1 = yield* service.create(testParams)
        const result2 = yield* service.create(testParams)
        return { id1: result1.resultId, id2: result2.resultId }
      }).pipe(
        Effect.provide(ResultServiceLive),
        Effect.provide(R2ServiceMock),
        Effect.provide(UploadServiceMock),
        Effect.provide(PostHogServiceMock)
      )

      const result = await Effect.runPromise(program)

      // IDs should be different for each call
      expect(result.id1).not.toBe(result.id2)
      // IDs should be cuid2 format (alphanumeric, ~24 chars)
      expect(result.id1).toMatch(/^[a-z0-9]+$/)
      expect(result.id1.length).toBeGreaterThan(20)
    })

    it("stores image at correct R2 path: results/{resultId}/full.jpg", async () => {
      let uploadedKey = ""
      const R2ServiceCaptureMock = Layer.succeed(R2Service, {
        upload: (key: string, _body: Buffer, _contentType: string) => {
          uploadedKey = key
          return Effect.succeed(`https://bucket.r2.cloudflarestorage.com/${key}`)
        },
        generatePresignedUploadUrl: () => Effect.succeed({ url: "https://upload.url", key: "key", expiresAt: new Date() }),
        generatePresignedDownloadUrl: () => Effect.succeed({ url: "https://download.url", key: "key", expiresAt: new Date() }),
        delete: () => Effect.succeed(undefined),
        deletePrefix: () => Effect.succeed(0),
        headObject: () => Effect.succeed(true),
        getUploadUrl: () => Effect.succeed("https://upload.url"),
        getDownloadUrl: () => Effect.succeed("https://download.url"),
      })

      const testParams: CreateResultParams = {
        uploadId: "test-upload-id",
        fullImageBuffer: Buffer.from("test-image-data"),
      }

      const program = Effect.gen(function* () {
        const service = yield* ResultService
        return yield* service.create(testParams)
      }).pipe(
        Effect.provide(ResultServiceLive),
        Effect.provide(R2ServiceCaptureMock),
        Effect.provide(UploadServiceMock),
        Effect.provide(PostHogServiceMock)
      )

      const result = await Effect.runPromise(program)

      // Verify the key pattern
      expect(uploadedKey).toMatch(/^results\/[a-z0-9]+\/full\.jpg$/)
      expect(result.resultUrl).toBe(uploadedKey)
    })

    it("uses correct content-type for uploaded image", async () => {
      let uploadedContentType = ""
      const R2ServiceCaptureMock = Layer.succeed(R2Service, {
        upload: (key: string, _body: Buffer, contentType: string) => {
          uploadedContentType = contentType
          return Effect.succeed(`https://bucket.r2.cloudflarestorage.com/${key}`)
        },
        generatePresignedUploadUrl: () => Effect.succeed({ url: "https://upload.url", key: "key", expiresAt: new Date() }),
        generatePresignedDownloadUrl: () => Effect.succeed({ url: "https://download.url", key: "key", expiresAt: new Date() }),
        delete: () => Effect.succeed(undefined),
        deletePrefix: () => Effect.succeed(0),
        headObject: () => Effect.succeed(true),
        getUploadUrl: () => Effect.succeed("https://upload.url"),
        getDownloadUrl: () => Effect.succeed("https://download.url"),
      })

      const testParams: CreateResultParams = {
        uploadId: "test-upload-id",
        fullImageBuffer: Buffer.from("test-image-data"),
        mimeType: "image/png",
      }

      const program = Effect.gen(function* () {
        const service = yield* ResultService
        return yield* service.create(testParams)
      }).pipe(
        Effect.provide(ResultServiceLive),
        Effect.provide(R2ServiceCaptureMock),
        Effect.provide(UploadServiceMock),
        Effect.provide(PostHogServiceMock)
      )

      await Effect.runPromise(program)

      expect(uploadedContentType).toBe("image/png")
    })

    it("defaults to image/jpeg when mimeType not provided", async () => {
      let uploadedContentType = ""
      const R2ServiceCaptureMock = Layer.succeed(R2Service, {
        upload: (_key: string, _body: Buffer, contentType: string) => {
          uploadedContentType = contentType
          return Effect.succeed("https://bucket.r2.cloudflarestorage.com/key")
        },
        generatePresignedUploadUrl: () => Effect.succeed({ url: "https://upload.url", key: "key", expiresAt: new Date() }),
        generatePresignedDownloadUrl: () => Effect.succeed({ url: "https://download.url", key: "key", expiresAt: new Date() }),
        delete: () => Effect.succeed(undefined),
        deletePrefix: () => Effect.succeed(0),
        headObject: () => Effect.succeed(true),
        getUploadUrl: () => Effect.succeed("https://upload.url"),
        getDownloadUrl: () => Effect.succeed("https://download.url"),
      })

      const testParams: CreateResultParams = {
        uploadId: "test-upload-id",
        fullImageBuffer: Buffer.from("test-image-data"),
        // No mimeType provided
      }

      const program = Effect.gen(function* () {
        const service = yield* ResultService
        return yield* service.create(testParams)
      }).pipe(
        Effect.provide(ResultServiceLive),
        Effect.provide(R2ServiceCaptureMock),
        Effect.provide(UploadServiceMock),
        Effect.provide(PostHogServiceMock)
      )

      await Effect.runPromise(program)

      expect(uploadedContentType).toBe("image/jpeg")
    })
  })

  describe("getById", () => {
    it("returns NotFoundError when result does not exist", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ResultService
        return yield* service.getById("non-existent-id")
      }).pipe(
        Effect.provide(ResultServiceLive),
        Effect.provide(R2ServiceMock),
        Effect.provide(UploadServiceMock),
        Effect.provide(PostHogServiceMock)
      )

      const result = await Effect.runPromise(Effect.either(program))
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(NotFoundError)
      }
    })
  })

  describe("getByUploadId", () => {
    it("returns NotFoundError when upload has no result", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ResultService
        return yield* service.getByUploadId("upload-without-result")
      }).pipe(
        Effect.provide(ResultServiceLive),
        Effect.provide(R2ServiceMock),
        Effect.provide(UploadServiceMock),
        Effect.provide(PostHogServiceMock)
      )

      const result = await Effect.runPromise(Effect.either(program))
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(NotFoundError)
      }
    })
  })
})
