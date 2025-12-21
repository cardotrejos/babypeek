import { Effect, Context, Layer } from "effect"
import { eq } from "drizzle-orm"
import { db, uploads, type Upload } from "@3d-ultra/db"
import { NotFoundError, UnauthorizedError } from "../lib/errors"

// Result view - projection of upload for result display
export interface Result {
  id: string
  uploadId: string
  resultUrl: string
  previewUrl: string
  email: string
  createdAt: Date
}

// Result Service interface
export class ResultService extends Context.Tag("ResultService")<
  ResultService,
  {
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

// Result Service implementation
export const ResultServiceLive = Layer.succeed(ResultService, {
  getById: (id) =>
    Effect.promise(async () => {
      const upload = await db.query.uploads.findFirst({
        where: eq(uploads.id, id),
      })
      return upload ? toResult(upload) : null
    }).pipe(
      Effect.flatMap((result) =>
        result ? Effect.succeed(result) : Effect.fail(new NotFoundError({ resource: "result", id }))
      )
    ),

  getByIdWithAuth: (id, sessionToken) =>
    Effect.promise(async () => {
      const upload = await db.query.uploads.findFirst({
        where: eq(uploads.id, id),
      })
      return upload
    }).pipe(
      Effect.flatMap((upload): Effect.Effect<Result, NotFoundError | UnauthorizedError> => {
        if (!upload) {
          return Effect.fail(new NotFoundError({ resource: "result", id }))
        }
        if (upload.sessionToken !== sessionToken) {
          return Effect.fail(new UnauthorizedError({ reason: "INVALID_TOKEN" }))
        }
        const result = toResult(upload)
        if (!result) {
          return Effect.fail(new NotFoundError({ resource: "result", id }))
        }
        return Effect.succeed(result)
      })
    ),

  getByUploadId: (uploadId) =>
    Effect.promise(async () => {
      const upload = await db.query.uploads.findFirst({
        where: eq(uploads.id, uploadId),
      })
      return upload ? toResult(upload) : null
    }).pipe(
      Effect.flatMap((result) =>
        result ? Effect.succeed(result) : Effect.fail(new NotFoundError({ resource: "result", id: uploadId }))
      )
    ),
})
