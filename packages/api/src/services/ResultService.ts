import { Effect, Context, Layer } from "effect"
import { eq } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"
import { db, uploads, results, type Upload, type PromptVersion } from "@babypeek/db"
import { NotFoundError, UnauthorizedError, ResultError, R2Error } from "../lib/errors"
import { R2Service } from "./R2Service"

// Result view - projection of a single result
export interface ResultView {
  id: string
  uploadId: string
  resultUrl: string
  previewUrl: string | null
  promptVersion: PromptVersion
  variantIndex: number
  createdAt: Date
}

// Full result set for an upload - includes all variants
export interface ResultSet {
  uploadId: string
  email: string
  originalUrl: string
  results: ResultView[]
  createdAt: Date
}

// Create result parameters
export interface CreateResultParams {
  uploadId: string
  fullImageBuffer: Buffer
  promptVersion: PromptVersion
  variantIndex: number
  mimeType?: string
  generationTimeMs?: number
}

// Created result - returned from create operation
export interface CreatedResult {
  resultId: string
  uploadId: string
  resultUrl: string // R2 key
  promptVersion: PromptVersion
  variantIndex: number
  fileSizeBytes: number
}

// Result Service interface
export class ResultService extends Context.Tag("ResultService")<
  ResultService,
  {
    /**
     * Create a new result by storing image in R2 and inserting into results table.
     *
     * @param params - CreateResultParams with uploadId, image buffer, and variant info
     * @returns CreatedResult with resultId, uploadId, R2 key, and file size
     * @throws ResultError if storage or DB insert fails
     */
    create: (params: CreateResultParams) => Effect.Effect<CreatedResult, ResultError | R2Error>
    
    /**
     * Get a single result by its ID.
     */
    getById: (id: string) => Effect.Effect<ResultView, NotFoundError>
    
    /**
     * Get a single result with auth verification.
     */
    getByIdWithAuth: (id: string, sessionToken: string) => Effect.Effect<ResultView, NotFoundError | UnauthorizedError>
    
    /**
     * Get all results for an upload.
     */
    getByUploadId: (uploadId: string) => Effect.Effect<ResultSet, NotFoundError>
    
    /**
     * Get all results for an upload with auth verification.
     */
    getByUploadIdWithAuth: (uploadId: string, sessionToken: string) => Effect.Effect<ResultSet, NotFoundError | UnauthorizedError>
  }
>() {}

// Helper to convert DB result to ResultView
const toResultView = (result: typeof results.$inferSelect): ResultView => ({
  id: result.id,
  uploadId: result.uploadId,
  resultUrl: result.resultUrl,
  previewUrl: result.previewUrl,
  promptVersion: result.promptVersion as PromptVersion,
  variantIndex: result.variantIndex,
  createdAt: result.createdAt,
})

const getById = Effect.fn("ResultService.getById")(function* (id: string) {
  const result = yield* Effect.promise(async () => {
    return db.query.results.findFirst({
      where: eq(results.id, id),
    })
  })
  
  if (!result) {
    return yield* Effect.fail(new NotFoundError({ resource: "result", id }))
  }
  
  return toResultView(result)
})

const getByIdWithAuth = Effect.fn("ResultService.getByIdWithAuth")(function* (
  id: string,
  sessionToken: string
) {
  // First get the result
  const result = yield* Effect.promise(async () => {
    return db.query.results.findFirst({
      where: eq(results.id, id),
    })
  })

  if (!result) {
    return yield* Effect.fail(new NotFoundError({ resource: "result", id }))
  }

  // Then verify the session token via the upload
  const upload = yield* Effect.promise(async () => {
    return db.query.uploads.findFirst({
      where: eq(uploads.id, result.uploadId),
    })
  })

  if (!upload || upload.sessionToken !== sessionToken) {
    return yield* Effect.fail(new UnauthorizedError({ reason: "INVALID_TOKEN" }))
  }

  return toResultView(result)
})

const getByUploadId = Effect.fn("ResultService.getByUploadId")(function* (uploadId: string) {
  // Get the upload first
  const upload = yield* Effect.promise(async () => {
    return db.query.uploads.findFirst({
      where: eq(uploads.id, uploadId),
    })
  })

  if (!upload) {
    return yield* Effect.fail(new NotFoundError({ resource: "upload", id: uploadId }))
  }

  // Get all results for this upload
  const resultRows = yield* Effect.promise(async () => {
    return db.query.results.findMany({
      where: eq(results.uploadId, uploadId),
      orderBy: (results, { asc }) => [asc(results.variantIndex)],
    })
  })

  return {
    uploadId,
    email: upload.email,
    originalUrl: upload.originalUrl,
    results: resultRows.map(toResultView),
    createdAt: upload.createdAt,
  } satisfies ResultSet
})

const getByUploadIdWithAuth = Effect.fn("ResultService.getByUploadIdWithAuth")(function* (
  uploadId: string,
  sessionToken: string
) {
  // Get the upload first
  const upload = yield* Effect.promise(async () => {
    return db.query.uploads.findFirst({
      where: eq(uploads.id, uploadId),
    })
  })

  if (!upload) {
    return yield* Effect.fail(new NotFoundError({ resource: "upload", id: uploadId }))
  }

  if (upload.sessionToken !== sessionToken) {
    return yield* Effect.fail(new UnauthorizedError({ reason: "INVALID_TOKEN" }))
  }

  // Get all results for this upload
  const resultRows = yield* Effect.promise(async () => {
    return db.query.results.findMany({
      where: eq(results.uploadId, uploadId),
      orderBy: (results, { asc }) => [asc(results.variantIndex)],
    })
  })

  return {
    uploadId,
    email: upload.email,
    originalUrl: upload.originalUrl,
    results: resultRows.map(toResultView),
    createdAt: upload.createdAt,
  } satisfies ResultSet
})

/**
 * Create a new result by storing image in R2 and inserting into results table.
 *
 * Flow:
 * 1. Generate unique resultId using cuid2
 * 2. Upload full-resolution image to R2 at results/{resultId}/full.jpg
 * 3. Insert into results table
 * 4. Return CreatedResult with all metadata
 */
const createResult = (r2Service: R2Service["Type"]) =>
  Effect.fn("ResultService.create")(function* (params: CreateResultParams) {
    const { uploadId, fullImageBuffer, promptVersion, variantIndex, mimeType = "image/jpeg", generationTimeMs } = params

    // Generate unique result ID
    const resultId = createId()
    const r2Key = `results/${uploadId}/${resultId}_v${variantIndex}.jpg`

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

    // Step 2: Insert into results table
    const insertResult = yield* Effect.tryPromise({
      try: () =>
        db
          .insert(results)
          .values({
            id: resultId,
            uploadId,
            resultUrl: r2Key,
            promptVersion,
            variantIndex,
            fileSizeBytes: fullImageBuffer.length,
            generationTimeMs,
          })
          .returning({ id: results.id }),
      catch: (e) =>
        new ResultError({
          cause: "DB_FAILED",
          message: `Failed to insert result record: ${String(e)}`,
          uploadId,
          resultId,
        }),
    })

    if (!insertResult || insertResult.length === 0) {
      return yield* Effect.fail(
        new ResultError({
          cause: "DB_FAILED",
          message: `Failed to insert result record`,
          uploadId,
          resultId,
        })
      )
    }

    // Step 3: Update upload record with first result URL (for backward compatibility)
    if (variantIndex === 1) {
      yield* Effect.tryPromise({
        try: () =>
          db
            .update(uploads)
            .set({
              resultUrl: r2Key,
              promptVersion,
              updatedAt: new Date(),
            })
            .where(eq(uploads.id, uploadId)),
        catch: () => Effect.succeed(null), // Non-critical, don't fail
      })
    }

    return {
      resultId,
      uploadId,
      resultUrl: r2Key,
      promptVersion,
      variantIndex,
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
      getByUploadIdWithAuth,
    }
  })
)
