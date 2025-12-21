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
): Effect.Effect<Result, NotFoundError | UnauthorizedError> {
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

// Result Service implementation
export const ResultServiceLive = Layer.succeed(ResultService, {
  getById,
  getByIdWithAuth,
  getByUploadId,
})
