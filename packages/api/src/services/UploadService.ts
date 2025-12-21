import { Effect, Context, Layer } from "effect"
import { eq } from "drizzle-orm"
import { db, uploads, type Upload, type UploadStatus } from "@3d-ultra/db"
import { NotFoundError } from "../lib/errors"

// Upload stage for processing progress
export type UploadStage = "validating" | "generating" | "watermarking" | "complete"

// Create upload parameters
export interface CreateUploadParams {
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
  }
>() {}

// Upload Service implementation
export const UploadServiceLive = Layer.succeed(UploadService, {
  create: (params) =>
    Effect.promise(async () => {
      const result = await db
        .insert(uploads)
        .values({
          email: params.email,
          sessionToken: params.sessionToken,
          originalUrl: params.originalUrl,
          status: "pending",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        })
        .returning()
      // Result always returns at least the inserted row
      return result[0]!
    }),

  getById: (id) =>
    Effect.promise(async () => {
      const upload = await db.query.uploads.findFirst({
        where: eq(uploads.id, id),
      })
      return upload
    }).pipe(
      Effect.flatMap((upload) =>
        upload ? Effect.succeed(upload) : Effect.fail(new NotFoundError({ resource: "upload", id }))
      )
    ),

  getBySessionToken: (token) =>
    Effect.promise(async () => {
      const upload = await db.query.uploads.findFirst({
        where: eq(uploads.sessionToken, token),
      })
      return upload
    }).pipe(
      Effect.flatMap((upload) =>
        upload ? Effect.succeed(upload) : Effect.fail(new NotFoundError({ resource: "upload", id: token }))
      )
    ),

  updateStatus: (id, status, errorMessage) =>
    Effect.promise(async () => {
      const result = await db
        .update(uploads)
        .set({
          status,
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(uploads.id, id))
        .returning()
      return result[0]
    }).pipe(
      Effect.flatMap((upload) =>
        upload ? Effect.void : Effect.fail(new NotFoundError({ resource: "upload", id }))
      )
    ),

  updateResult: (id, resultUrl, previewUrl) =>
    Effect.promise(async () => {
      const result = await db
        .update(uploads)
        .set({
          resultUrl,
          previewUrl,
          status: "completed" as UploadStatus,
          updatedAt: new Date(),
        })
        .where(eq(uploads.id, id))
        .returning()
      return result[0]
    }).pipe(
      Effect.flatMap((upload) =>
        upload ? Effect.void : Effect.fail(new NotFoundError({ resource: "upload", id }))
      )
    ),
})
