import { Effect, Context, Layer } from "effect"
import { eq } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { db, uploads, type Upload } from "@3d-ultra/db"
import { NotFoundError, UnauthorizedError, ResultError, R2Error } from "../lib/errors"
import { R2Service } from "./R2Service"

// Result view - projection of upload for result display
export interface Result {
  id: string
  uploadId: string
  resultUrl: string
  previewUrl: string
  email: string
  createdAt: Date
}

// Create result parameters
export interface CreateResultParams {
  uploadId: string
  fullImageBuffer: Buffer
  mimeType?: string
}

// Created result - returned from create operation
export interface CreatedResult {
  resultId: string
  uploadId: string
  resultUrl: string // R2 key
  fileSizeBytes: number
}

// Result Service interface
export class ResultService extends Context.Tag("ResultService")<
  ResultService,
  {
    /**
     * Create a new result by storing image in R2 and updating upload record.
     * Uses MVP approach: stores in uploads table (no separate results table).
     *
     * @param params - CreateResultParams with uploadId and image buffer
     * @returns CreatedResult with resultId, uploadId, R2 key, and file size
     * @throws ResultError if storage or DB update fails
     */
    create: (params: CreateResultParams) => Effect.Effect<CreatedResult, ResultError | R2Error>
    getById: (id: string) => Effect.Effect<Result, NotFoundError>
    getByIdWithAuth: (id: string, sessionToken: string) => Effect.Effect<Result, NotFoundError | UnauthorizedError>
    getByUploadId: (uploadId: string) => Effect.Effect<Result, NotFoundError>
  }
>() {}

// Helper to convert upload to result view
const toResult = (upload: Upload): Result | null => {
  if (!upload.resultUrl || !upload.previewUrl) return null
  return {
    id: upload.id,
    uploadId: upload.id,
    resultUrl: upload.resultUrl,
    previewUrl: upload.previewUrl,
    email: upload.email,
    createdAt: upload.createdAt,
  }
}

const getById = Effect.fn("ResultService.getById")(function* (id: string) {
  const upload = yield* Effect.promise(async () => {
    return db.query.uploads.findFirst({
      where: eq(uploads.id, id),
    })
  })
  const result = upload ? toResult(upload) : null
  if (!result) {
    return yield* Effect.fail(new NotFoundError({ resource: "result", id }))
  }
  return result
})

const getByIdWithAuth = Effect.fn("ResultService.getByIdWithAuth")(function* (
  id: string,
  sessionToken: string
) {
  const upload = yield* Effect.promise(async () => {
    return db.query.uploads.findFirst({
      where: eq(uploads.id, id),
    })
  })

  if (!upload) {
    return yield* Effect.fail(new NotFoundError({ resource: "result", id }))
  }
  if (upload.sessionToken !== sessionToken) {
    return yield* Effect.fail(new UnauthorizedError({ reason: "INVALID_TOKEN" }))
  }
  const result = toResult(upload)
  if (!result) {
    return yield* Effect.fail(new NotFoundError({ resource: "result", id }))
  }
  return result
})

const getByUploadId = Effect.fn("ResultService.getByUploadId")(function* (uploadId: string) {
  const upload = yield* Effect.promise(async () => {
    return db.query.uploads.findFirst({
      where: eq(uploads.id, uploadId),
    })
  })
  const result = upload ? toResult(upload) : null
  if (!result) {
    return yield* Effect.fail(new NotFoundError({ resource: "result", id: uploadId }))
  }
  return result
})

/**
 * Create a new result by storing image in R2 and updating upload record.
 *
 * Flow:
 * 1. Generate unique resultId using cuid2
 * 2. Upload full-resolution image to R2 at results/{resultId}/full.jpg
 * 3. Update upload record with resultUrl (previewUrl set later in Story 5.2)
 * 4. Return CreatedResult with all metadata
 *
 * Uses MVP approach: stores in uploads table (no separate results table).
 */
const createResult = (r2Service: R2Service["Type"]) =>
  Effect.fn("ResultService.create")(function* (params: CreateResultParams) {
    const { uploadId, fullImageBuffer, mimeType = "image/jpeg" } = params

    // Generate unique result ID
    const resultId = createId()
    const r2Key = `results/${resultId}/full.jpg`

    // Step 1: Upload to R2
    yield* Effect.mapError(
      r2Service.upload(r2Key, fullImageBuffer, mimeType),
      (r2Error) =>
        new ResultError({
          cause: "STORAGE_FAILED",
          message: `Failed to upload result to R2: ${r2Error.message}`,
          uploadId,
          resultId,
        })
    )

    // Step 2: Update upload record with resultUrl
    // Note: previewUrl is set in Story 5.2 (watermarking), not here
    // Note: status remains 'processing' - Story 4.5 handles final status update
    const updateResult = yield* Effect.tryPromise({
      try: () =>
        db
          .update(uploads)
          .set({
            resultUrl: r2Key,
            updatedAt: new Date(),
          })
          .where(eq(uploads.id, uploadId))
          .returning({ id: uploads.id }),
      catch: (e) =>
        new ResultError({
          cause: "DB_FAILED",
          message: `Failed to update upload record: ${String(e)}`,
          uploadId,
          resultId,
        }),
    })

    // Verify the upload was actually updated (guards against invalid uploadId)
    if (!updateResult || updateResult.length === 0) {
      return yield* Effect.fail(
        new ResultError({
          cause: "NOT_FOUND",
          message: `Upload record not found for uploadId: ${uploadId}`,
          uploadId,
          resultId,
        })
      )
    }

    return {
      resultId,
      uploadId,
      resultUrl: r2Key,
      fileSizeBytes: fullImageBuffer.length,
    } satisfies CreatedResult
  })

// Result Service implementation - uses R2Service dependency
export const ResultServiceLive = Layer.effect(
  ResultService,
  Effect.gen(function* () {
    const r2Service = yield* R2Service

    return {
      create: createResult(r2Service),
      getById,
      getByIdWithAuth,
      getByUploadId,
    }
  })
)
