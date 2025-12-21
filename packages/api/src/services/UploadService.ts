import { Effect, Context, Layer } from "effect"
import { eq, and } from "drizzle-orm"
import { db, uploads, type Upload, type UploadStatus, type UploadStage } from "@3d-ultra/db"
import { NotFoundError, AlreadyProcessingError, UploadStatusError } from "../lib/errors"

// Re-export UploadStage for consumers
export type { UploadStage }

// Valid stage transitions (can only move forward, except to failed)
const STAGE_ORDER: UploadStage[] = ["validating", "generating", "storing", "watermarking", "complete"]

function isValidStageTransition(currentStage: UploadStage | null, newStage: UploadStage): boolean {
  // Can always transition to failed
  if (newStage === "failed") return true
  
  // From null (no current stage), any stage is valid
  if (currentStage === null) return true
  
  // Cannot transition from complete or failed
  if (currentStage === "complete" || currentStage === "failed") return false
  
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  const newIndex = STAGE_ORDER.indexOf(newStage)
  
  // Can only move forward
  return newIndex > currentIndex
}

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
    /**
     * Get upload by ID with session token verification.
     * Used for authenticated status polling.
     *
     * @param id - The upload ID
     * @param sessionToken - Session token to verify ownership
     * @returns The upload record if found and token matches
     * @throws NotFoundError if upload doesn't exist or token doesn't match
     */
    getByIdWithAuth: (id: string, sessionToken: string) => Effect.Effect<Upload, NotFoundError>
    updateStatus: (id: string, status: UploadStatus, errorMessage?: string) => Effect.Effect<void, NotFoundError>
    updateResult: (id: string, resultUrl: string, previewUrl: string) => Effect.Effect<void, NotFoundError>
    /**
     * Update the processing stage and progress.
     * Validates stage transitions (can only move forward, except to failed).
     *
     * @param uploadId - The upload ID
     * @param stage - The new processing stage
     * @param progress - Progress percentage (0-100)
     * @returns The updated upload record
     * @throws NotFoundError if upload doesn't exist
     * @throws UploadStatusError if transition is invalid
     */
    updateStage: (uploadId: string, stage: UploadStage, progress: number) => Effect.Effect<Upload, NotFoundError | UploadStatusError>
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
    /**
     * Reset an upload for retry after failure.
     * Clears error state and resets status to "pending".
     * Only works for uploads in "failed" status.
     *
     * @param uploadId - The upload ID to reset
     * @returns The updated upload record
     * @throws NotFoundError if upload doesn't exist
     * @throws UploadStatusError if upload is not in "failed" status
     */
    resetForRetry: (uploadId: string) => Effect.Effect<Upload, NotFoundError | UploadStatusError>
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

const getByIdWithAuth = Effect.fn("UploadService.getByIdWithAuth")(function* (id: string, sessionToken: string) {
  const upload = yield* Effect.promise(async () => {
    return db.query.uploads.findFirst({
      where: and(eq(uploads.id, id), eq(uploads.sessionToken, sessionToken)),
    })
  })
  if (!upload) {
    return yield* Effect.fail(new NotFoundError({ resource: "upload", id }))
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

const updateStage = Effect.fn("UploadService.updateStage")(function* (
  uploadId: string,
  stage: UploadStage,
  progress: number
) {
  // Clamp progress to 0-100
  const clampedProgress = Math.max(0, Math.min(100, progress))

  // First, get the current upload to validate the transition
  const currentUpload = yield* Effect.promise(async () => {
    return db.query.uploads.findFirst({
      where: eq(uploads.id, uploadId),
    })
  })

  if (!currentUpload) {
    return yield* Effect.fail(new NotFoundError({ resource: "upload", id: uploadId }))
  }

  // Validate stage transition
  const currentStage = currentUpload.stage as UploadStage | null
  if (!isValidStageTransition(currentStage, stage)) {
    return yield* Effect.fail(
      new UploadStatusError({
        cause: "INVALID_TRANSITION",
        message: `Cannot transition from ${currentStage ?? "null"} to ${stage}`,
        uploadId,
      })
    )
  }

  // Determine auto-status based on stage
  let newStatus: UploadStatus = currentUpload.status
  if (stage === "complete") {
    newStatus = "completed"
  } else if (stage === "failed") {
    newStatus = "failed"
  } else if (currentUpload.status === "pending") {
    newStatus = "processing"
  }

  // Update stage and progress
  const result = yield* Effect.promise(async () => {
    return db
      .update(uploads)
      .set({
        stage,
        progress: clampedProgress,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(uploads.id, uploadId))
      .returning()
  })

  return result[0]!
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

const resetForRetry = Effect.fn("UploadService.resetForRetry")(function* (uploadId: string) {
  // Use atomic UPDATE with WHERE clause to only reset failed uploads
  const result = yield* Effect.promise(async () => {
    return db
      .update(uploads)
      .set({
        status: "pending" as UploadStatus,
        stage: null,
        progress: 0,
        errorMessage: null,
        workflowRunId: null,
        updatedAt: new Date(),
      })
      .where(and(eq(uploads.id, uploadId), eq(uploads.status, "failed")))
      .returning()
  })

  // If no rows returned, either upload doesn't exist or status wasn't "failed"
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

    // Upload exists but wasn't updated - must not be in "failed" status
    return yield* Effect.fail(
      new UploadStatusError({
        cause: "INVALID_TRANSITION",
        message: `Can only retry failed uploads. Current status: ${existingUpload.status}`,
        uploadId,
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
  getByIdWithAuth,
  updateStatus,
  updateResult,
  updateStage,
  startProcessing,
  resetForRetry,
})
