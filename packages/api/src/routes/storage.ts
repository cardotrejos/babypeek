import { Hono } from "hono";
import { Effect } from "effect";
import { R2Service, R2ServiceLive } from "../services/R2Service";
import { R2Error } from "../lib/errors";
import { z } from "zod";

const app = new Hono();

// Request schemas
const uploadUrlSchema = z.object({
  key: z.string().min(1, "Key is required"),
  contentType: z.string().min(1, "Content type is required"),
  expiresIn: z.number().optional(),
});

// Error response helper
const handleR2Error = (error: R2Error) => {
  switch (error.cause) {
    case "CONFIG_MISSING":
      return {
        status: 503 as const,
        body: { error: "Storage service not configured", code: error.cause },
      };
    case "INVALID_KEY":
      return { status: 400 as const, body: { error: error.message, code: error.cause } };
    case "PRESIGN_FAILED":
      return {
        status: 500 as const,
        body: { error: "Failed to generate signed URL", code: error.cause },
      };
    case "UPLOAD_FAILED":
      return { status: 500 as const, body: { error: "Failed to upload file", code: error.cause } };
    case "DOWNLOAD_FAILED":
      return {
        status: 500 as const,
        body: { error: "Failed to download file", code: error.cause },
      };
    case "DELETE_FAILED":
      return { status: 500 as const, body: { error: "Failed to delete file", code: error.cause } };
    default:
      return { status: 500 as const, body: { error: "Internal server error", code: "UNKNOWN" } };
  }
};

/**
 * POST /api/storage/upload-url
 * Generate a presigned URL for uploading a file
 */
app.post("/upload-url", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = uploadUrlSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, 400);
  }

  const { key, contentType, expiresIn } = parsed.data;

  const getUploadUrl = Effect.fn("routes.storage.getUploadUrl")(function* () {
    const r2 = yield* R2Service;
    return yield* r2.getUploadUrl(key, contentType, expiresIn);
  });

  const program = getUploadUrl().pipe(Effect.provide(R2ServiceLive));

  const result = await Effect.runPromise(Effect.either(program));

  if (result._tag === "Left") {
    const { status, body } = handleR2Error(result.left);
    return c.json(body, status);
  }

  return c.json({
    url: result.right,
    key,
    expiresIn: expiresIn || 15 * 60, // Default 15 minutes
  });
});

/**
 * GET /api/storage/download-url/:key
 * Generate a presigned URL for downloading a file
 * Note: key can include slashes for nested paths (e.g., uploads/123/original.jpg)
 */
app.get("/download-url/*", async (c) => {
  // Extract key from path (everything after /download-url/)
  const key = c.req.path.replace("/download-url/", "");

  // Validate expiresIn query param
  const expiresInParam = c.req.query("expiresIn");
  let expiresIn: number | undefined;

  if (expiresInParam) {
    const parsed = parseInt(expiresInParam, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return c.json({ error: "expiresIn must be a positive number", code: "INVALID_PARAM" }, 400);
    }
    expiresIn = parsed;
  }

  if (!key || key.trim() === "") {
    return c.json({ error: "Key is required", code: "INVALID_KEY" }, 400);
  }

  const getDownloadUrl = Effect.fn("routes.storage.getDownloadUrl")(function* () {
    const r2 = yield* R2Service;
    return yield* r2.getDownloadUrl(key, expiresIn);
  });

  const program = getDownloadUrl().pipe(Effect.provide(R2ServiceLive));

  const result = await Effect.runPromise(Effect.either(program));

  if (result._tag === "Left") {
    const { status, body } = handleR2Error(result.left);
    return c.json(body, status);
  }

  return c.json({
    url: result.right,
    key,
    expiresIn: expiresIn || 7 * 24 * 60 * 60, // Default 7 days
  });
});

export default app;
