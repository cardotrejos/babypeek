import { Effect, Context, Layer } from "effect";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, isR2Configured } from "../lib/env";
import { R2Error } from "../lib/errors";

// Default expiration times (in seconds)
const DEFAULT_UPLOAD_EXPIRES = 15 * 60; // 15 minutes
const DEFAULT_DOWNLOAD_EXPIRES = 7 * 24 * 60 * 60; // 7 days

// Presigned URL result type
export interface PresignedUrl {
  url: string;
  key: string;
  expiresAt: Date;
}

// R2 Service interface
export class R2Service extends Context.Tag("R2Service")<
  R2Service,
  {
    generatePresignedUploadUrl: (
      key: string,
      contentType: string,
      expiresIn?: number,
    ) => Effect.Effect<PresignedUrl, R2Error>;
    generatePresignedDownloadUrl: (
      key: string,
      optionsOrExpiresIn?: number | DownloadUrlOptions,
    ) => Effect.Effect<PresignedUrl, R2Error>;
    upload: (key: string, body: Buffer, contentType: string) => Effect.Effect<string, R2Error>;
    delete: (key: string) => Effect.Effect<void, R2Error>;
    deletePrefix: (prefix: string) => Effect.Effect<number, R2Error>;
    headObject: (key: string) => Effect.Effect<boolean, R2Error>;
    // Legacy aliases for backwards compatibility
    getUploadUrl: (
      key: string,
      contentType: string,
      expiresIn?: number,
    ) => Effect.Effect<string, R2Error>;
    getDownloadUrl: (
      key: string,
      optionsOrExpiresIn?: number | DownloadUrlOptions,
    ) => Effect.Effect<string, R2Error>;
  }
>() {}

// Cached S3 client - created once and reused
let cachedClient: S3Client | null = null;

const getR2Client = (): S3Client | null => {
  if (cachedClient) return cachedClient;

  if (!isR2Configured()) return null;

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });

  return cachedClient;
};

// Helper to validate R2 config and key
const validateR2Request = Effect.fn("R2Service.validateR2Request")(function* (key: string) {
  const client = getR2Client();

  if (!client) {
    return yield* Effect.fail(
      new R2Error({
        cause: "CONFIG_MISSING",
        message:
          "R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in environment.",
      }),
    );
  }

  const bucketName = env.R2_BUCKET_NAME;
  if (!bucketName) {
    return yield* Effect.fail(
      new R2Error({
        cause: "CONFIG_MISSING",
        message: "R2_BUCKET_NAME not configured in environment.",
      }),
    );
  }

  if (!key || key.trim() === "") {
    return yield* Effect.fail(
      new R2Error({
        cause: "INVALID_KEY",
        message: "Object key cannot be empty.",
      }),
    );
  }

  return { client, bucketName };
});

const generatePresignedUploadUrl = Effect.fn("R2Service.generatePresignedUploadUrl")(function* (
  key: string,
  contentType: string,
  expiresIn = DEFAULT_UPLOAD_EXPIRES,
) {
  const { client, bucketName } = yield* validateR2Request(key);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const url = yield* Effect.tryPromise({
    try: () => getSignedUrl(client, command, { expiresIn }),
    catch: (error) =>
      new R2Error({
        cause: "PRESIGN_FAILED",
        message: `Failed to generate upload URL: ${error}`,
      }),
  });

  return {
    url,
    key,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
});

// Options for download URL generation
export interface DownloadUrlOptions {
  expiresIn?: number;
  filename?: string; // Custom filename for Content-Disposition
}

const generatePresignedDownloadUrl = Effect.fn("R2Service.generatePresignedDownloadUrl")(function* (
  key: string,
  optionsOrExpiresIn: number | DownloadUrlOptions = DEFAULT_DOWNLOAD_EXPIRES,
) {
  const { client, bucketName } = yield* validateR2Request(key);

  // Support both legacy number param and new options object
  const options: DownloadUrlOptions =
    typeof optionsOrExpiresIn === "number" ? { expiresIn: optionsOrExpiresIn } : optionsOrExpiresIn;

  const expiresIn = options.expiresIn ?? DEFAULT_DOWNLOAD_EXPIRES;

  // Build command with optional Content-Disposition
  const commandParams: {
    Bucket: string;
    Key: string;
    ResponseContentDisposition?: string;
  } = {
    Bucket: bucketName,
    Key: key,
  };

  // Add Content-Disposition for browser download with custom filename
  if (options.filename) {
    // Encode filename for special characters (RFC 5987)
    const encodedFilename = encodeURIComponent(options.filename).replace(/'/g, "%27");
    commandParams.ResponseContentDisposition = `attachment; filename="${options.filename}"; filename*=UTF-8''${encodedFilename}`;
  }

  const command = new GetObjectCommand(commandParams);

  const url = yield* Effect.tryPromise({
    try: () => getSignedUrl(client, command, { expiresIn }),
    catch: (error) =>
      new R2Error({
        cause: "PRESIGN_FAILED",
        message: `Failed to generate download URL: ${error}`,
      }),
  });

  return {
    url,
    key,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
});

const uploadObject = Effect.fn("R2Service.upload")(function* (
  key: string,
  body: Buffer,
  contentType: string,
) {
  const { client, bucketName } = yield* validateR2Request(key);

  yield* Effect.tryPromise({
    try: () =>
      client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      ),
    catch: (error) =>
      new R2Error({
        cause: "UPLOAD_FAILED",
        message: `Failed to upload to R2: ${error}`,
      }),
  });

  return `https://${bucketName}.r2.cloudflarestorage.com/${key}`;
});

const deleteObject = Effect.fn("R2Service.delete")(function* (key: string) {
  const { client, bucketName } = yield* validateR2Request(key);

  yield* Effect.tryPromise({
    try: () =>
      client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      ),
    catch: (error) =>
      new R2Error({
        cause: "DELETE_FAILED",
        message: `Failed to delete from R2: ${error}`,
      }),
  });
});

const headObject = Effect.fn("R2Service.headObject")(function* (key: string) {
  const { client, bucketName } = yield* validateR2Request(key);

  return yield* Effect.tryPromise({
    try: async () => {
      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: bucketName,
            Key: key,
          }),
        );
        return true;
      } catch (error) {
        // If the object doesn't exist, S3 returns a 404
        if (
          (error as { name?: string }).name === "NotFound" ||
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
        ) {
          return false;
        }
        throw error;
      }
    },
    catch: (error) =>
      new R2Error({
        cause: "HEAD_FAILED",
        message: `Failed to check object existence in R2: ${error}`,
      }),
  });
});

const deletePrefix = Effect.fn("R2Service.deletePrefix")(function* (prefix: string) {
  const { client, bucketName } = yield* validateR2Request(prefix);

  // List all objects with the given prefix
  const listResult = yield* Effect.tryPromise({
    try: () =>
      client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
        }),
      ),
    catch: (error) =>
      new R2Error({
        cause: "LIST_FAILED",
        message: `Failed to list objects with prefix ${prefix}: ${error}`,
      }),
  });

  const objects = listResult.Contents || [];
  let deletedCount = 0;

  // Delete each object found
  for (const obj of objects) {
    if (obj.Key) {
      yield* Effect.tryPromise({
        try: () =>
          client.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: obj.Key,
            }),
          ),
        catch: (error) =>
          new R2Error({
            cause: "DELETE_FAILED",
            message: `Failed to delete ${obj.Key} from R2: ${error}`,
          }),
      });
      deletedCount++;
    }
  }

  return deletedCount;
});

const getUploadUrl = Effect.fn("R2Service.getUploadUrl")(function* (
  key: string,
  contentType: string,
  expiresIn = DEFAULT_UPLOAD_EXPIRES,
) {
  const result = yield* generatePresignedUploadUrl(key, contentType, expiresIn);
  return result.url;
});

const getDownloadUrl = Effect.fn("R2Service.getDownloadUrl")(function* (
  key: string,
  optionsOrExpiresIn: number | DownloadUrlOptions = DEFAULT_DOWNLOAD_EXPIRES,
) {
  const result = yield* generatePresignedDownloadUrl(key, optionsOrExpiresIn);
  return result.url;
});

// R2 Service implementation
export const R2ServiceLive = Layer.succeed(R2Service, {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  upload: uploadObject,
  delete: deleteObject,
  deletePrefix,
  headObject,
  // Legacy aliases for backwards compatibility
  getUploadUrl,
  getDownloadUrl,
});
