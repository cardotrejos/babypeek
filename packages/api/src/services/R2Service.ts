import { Effect, Context, Layer } from "effect"
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env, isR2Configured } from "../lib/env"
import { R2Error } from "../lib/errors"

// Default expiration times (in seconds)
const DEFAULT_UPLOAD_EXPIRES = 15 * 60 // 15 minutes
const DEFAULT_DOWNLOAD_EXPIRES = 7 * 24 * 60 * 60 // 7 days

// Presigned URL result type
export interface PresignedUrl {
  url: string
  key: string
  expiresAt: Date
}

// R2 Service interface
export class R2Service extends Context.Tag("R2Service")<
  R2Service,
  {
    generatePresignedUploadUrl: (key: string, contentType: string, expiresIn?: number) => Effect.Effect<PresignedUrl, R2Error>
    generatePresignedDownloadUrl: (key: string, expiresIn?: number) => Effect.Effect<PresignedUrl, R2Error>
    upload: (key: string, body: Buffer, contentType: string) => Effect.Effect<string, R2Error>
    delete: (key: string) => Effect.Effect<void, R2Error>
    headObject: (key: string) => Effect.Effect<boolean, R2Error>
    // Legacy aliases for backwards compatibility
    getUploadUrl: (key: string, contentType: string, expiresIn?: number) => Effect.Effect<string, R2Error>
    getDownloadUrl: (key: string, expiresIn?: number) => Effect.Effect<string, R2Error>
  }
>() {}

// Cached S3 client - created once and reused
let cachedClient: S3Client | null = null

const getR2Client = (): S3Client | null => {
  if (cachedClient) return cachedClient

  if (!isR2Configured()) return null

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  })

  return cachedClient
}

// Helper to validate R2 config and key
const validateR2Request = (key: string) =>
  Effect.gen(function* () {
    const client = getR2Client()

    if (!client) {
      return yield* Effect.fail(
        new R2Error({
          cause: "CONFIG_MISSING",
          message: "R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in environment.",
        })
      )
    }

    const bucketName = env.R2_BUCKET_NAME
    if (!bucketName) {
      return yield* Effect.fail(
        new R2Error({
          cause: "CONFIG_MISSING",
          message: "R2_BUCKET_NAME not configured in environment.",
        })
      )
    }

    if (!key || key.trim() === "") {
      return yield* Effect.fail(
        new R2Error({
          cause: "INVALID_KEY",
          message: "Object key cannot be empty.",
        })
      )
    }

    return { client, bucketName }
  })

// R2 Service implementation
export const R2ServiceLive = Layer.succeed(R2Service, {
  generatePresignedUploadUrl: (key, contentType, expiresIn = DEFAULT_UPLOAD_EXPIRES) =>
    Effect.gen(function* () {
      const { client, bucketName } = yield* validateR2Request(key)

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      })

      const url = yield* Effect.tryPromise({
        try: () => getSignedUrl(client, command, { expiresIn }),
        catch: (error) =>
          new R2Error({
            cause: "PRESIGN_FAILED",
            message: `Failed to generate upload URL: ${error}`,
          }),
      })

      return {
        url,
        key,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      }
    }),

  generatePresignedDownloadUrl: (key, expiresIn = DEFAULT_DOWNLOAD_EXPIRES) =>
    Effect.gen(function* () {
      const { client, bucketName } = yield* validateR2Request(key)

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })

      const url = yield* Effect.tryPromise({
        try: () => getSignedUrl(client, command, { expiresIn }),
        catch: (error) =>
          new R2Error({
            cause: "PRESIGN_FAILED",
            message: `Failed to generate download URL: ${error}`,
          }),
      })

      return {
        url,
        key,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      }
    }),

  upload: (key, body, contentType) =>
    Effect.gen(function* () {
      const { client, bucketName } = yield* validateR2Request(key)

      yield* Effect.tryPromise({
        try: () =>
          client.send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: key,
              Body: body,
              ContentType: contentType,
            })
          ),
        catch: (error) =>
          new R2Error({
            cause: "UPLOAD_FAILED",
            message: `Failed to upload to R2: ${error}`,
          }),
      })

      return `https://${bucketName}.r2.cloudflarestorage.com/${key}`
    }),

  delete: (key) =>
    Effect.gen(function* () {
      const { client, bucketName } = yield* validateR2Request(key)

      yield* Effect.tryPromise({
        try: () =>
          client.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: key,
            })
          ),
        catch: (error) =>
          new R2Error({
            cause: "DELETE_FAILED",
            message: `Failed to delete from R2: ${error}`,
          }),
      })
    }),

  headObject: (key) =>
    Effect.gen(function* () {
      const { client, bucketName } = yield* validateR2Request(key)

      const result = yield* Effect.tryPromise({
        try: async () => {
          try {
            await client.send(
              new HeadObjectCommand({
                Bucket: bucketName,
                Key: key,
              })
            )
            return true
          } catch (error) {
            // If the object doesn't exist, S3 returns a 404
            if ((error as { name?: string }).name === "NotFound" || 
                (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
              return false
            }
            throw error
          }
        },
        catch: (error) =>
          new R2Error({
            cause: "HEAD_FAILED",
            message: `Failed to check object existence in R2: ${error}`,
          }),
      })

      return result
    }),

  // Legacy aliases for backwards compatibility
  getUploadUrl: (key, contentType, expiresIn = DEFAULT_UPLOAD_EXPIRES) =>
    Effect.gen(function* () {
      const { client, bucketName } = yield* validateR2Request(key)

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      })

      return yield* Effect.tryPromise({
        try: () => getSignedUrl(client, command, { expiresIn }),
        catch: (error) =>
          new R2Error({
            cause: "PRESIGN_FAILED",
            message: `Failed to generate upload URL: ${error}`,
          }),
      })
    }),

  getDownloadUrl: (key, expiresIn = DEFAULT_DOWNLOAD_EXPIRES) =>
    Effect.gen(function* () {
      const { client, bucketName } = yield* validateR2Request(key)

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })

      return yield* Effect.tryPromise({
        try: () => getSignedUrl(client, command, { expiresIn }),
        catch: (error) =>
          new R2Error({
            cause: "PRESIGN_FAILED",
            message: `Failed to generate download URL: ${error}`,
          }),
      })
    }),
})
