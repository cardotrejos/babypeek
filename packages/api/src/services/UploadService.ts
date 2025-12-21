import { Effect, Context, Layer } from "effect"
import { eq, and } from "drizzle-orm"
import { db, uploads, type Upload, type UploadStatus } from "@3d-ultra/db"
import { NotFoundError, AlreadyProcessingError } from "../lib/errors"

// Upload stage for processing progress
export type UploadStage = "validating" | "generating" | "watermarking" | "complete"

// Create upload parameters
export interface CreateUploadParams {
  id: string // Pre-generated ID to match R2 key
  email: string
  sessionToken: string
  originalUrl: string
}

// Upload Service interface
export class UploadService extends Context.Tag("UploadService")<
  UploadService,
  {
    create: (params: CreateUploadParams) => Effect.Effect<Upload, never>
    getById: (id: string) => Effect.Effect<Upload, NotFoundError>
    getBySessionToken: (token: string) => Effect.Effect<Upload, NotFoundError>
    updateStatus: (id: string, status: UploadStatus, errorMessage?: string) => Effect.Effect<void, NotFoundError>
    updateResult: (id: string, resultUrl: string, previewUrl: string) => Effect.Effect<void, NotFoundError>
    /**
     * Start processing for an upload.
     * Updates status to "processing" and stores the workflow run ID.
     *
     * @param uploadId - The upload ID to start processing
     * @param workflowRunId - The Workflow DevKit run ID
     * @returns The updated upload record
     * @throws NotFoundError if upload doesn't exist
     * @throws AlreadyProcessingError if upload is not in "pending" status
     */
    startProcessing: (uploadId: string, workflowRunId: string) => Effect.Effect<Upload, NotFoundError | AlreadyProcessingError>
  }
>() {}

const create = Effect.fn("UploadService.create")(function* (params: CreateUploadParams) {
  const result = yield* Effect.promise(async () => {
    return db
      .insert(uploads)
      .values({
        id: params.id, // Use pre-generated ID to match R2 key
        email: params.email,
        sessionToken: params.sessionToken,
        originalUrl: params.originalUrl,
        status: "pending",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      })
      .returning()
  })
  // Result always returns at least the inserted row
  return result[0]!
})

const getById = Effect.fn("UploadService.getById")(function* (id: string) {
  const upload = yield* Effect.promise(async () => {
    return db.query.uploads.findFirst({
      where: eq(uploads.id, id),
    })
  })
  if (!upload) {
    return yield* Effect.fail(new NotFoundError({ resource: "upload", id }))
  }
  return upload
})

const getBySessionToken = Effect.fn("UploadService.getBySessionToken")(function* (token: string) {
  const upload = yield* Effect.promise(async () => {
    return db.query.uploads.findFirst({
      where: eq(uploads.sessionToken, token),
    })
  })
  if (!upload) {
    return yield* Effect.fail(new NotFoundError({ resource: "upload", id: token }))
  }
  return upload
})

const updateStatus = Effect.fn("UploadService.updateStatus")(function* (
  id: string,
  status: UploadStatus,
  errorMessage?: string
) {
  const result = yield* Effect.promise(async () => {
    return db
      .update(uploads)
      .set({
        status,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(uploads.id, id))
      .returning()
  })
  if (!result[0]) {
    return yield* Effect.fail(new NotFoundError({ resource: "upload", id }))
  }
})

const updateResult = Effect.fn("UploadService.updateResult")(function* (
  id: string,
  resultUrl: string,
  previewUrl: string
) {
  const result = yield* Effect.promise(async () => {
    return db
      .update(uploads)
      .set({
        resultUrl,
        previewUrl,
        status: "completed" as UploadStatus,
        updatedAt: new Date(),
      })
      .where(eq(uploads.id, id))
      .returning()
  })
  if (!result[0]) {
    return yield* Effect.fail(new NotFoundError({ resource: "upload", id }))
  }
})

const startProcessing = Effect.fn("UploadService.startProcessing")(function* (
  uploadId: string,
  workflowRunId: string
) {
  // Use atomic UPDATE with WHERE clause to prevent race conditions
  // Only update if id matches AND status is "pending" - this is a single atomic operation
  const result = yield* Effect.promise(async () => {
    return db
      .update(uploads)
      .set({
        status: "processing" as UploadStatus,
        workflowRunId,
        updatedAt: new Date(),
      })
      .where(and(eq(uploads.id, uploadId), eq(uploads.status, "pending")))
      .returning()
  })

  // If no rows returned, either upload doesn't exist or status wasn't "pending"
  if (!result[0]) {
    // Check if upload exists to determine correct error
    const existingUpload = yield* Effect.promise(async () => {
      return db.query.uploads.findFirst({
        where: eq(uploads.id, uploadId),
      })
    })

    if (!existingUpload) {
      return yield* Effect.fail(new NotFoundError({ resource: "upload", id: uploadId }))
    }

    // Upload exists but wasn't updated - must not be in "pending" status
    return yield* Effect.fail(
      new AlreadyProcessingError({
        uploadId,
        currentStatus: existingUpload.status,
      })
    )
  }

  // Return the updated upload
  return result[0]
})

// Upload Service implementation
export const UploadServiceLive = Layer.succeed(UploadService, {
  create,
  getById,
  getBySessionToken,
  updateStatus,
  updateResult,
  startProcessing,
})
