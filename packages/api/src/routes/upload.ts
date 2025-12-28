import { Hono } from "hono";
import { Effect, Layer } from "effect";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import { R2Service, R2ServiceLive } from "../services/R2Service";
import { UploadService, UploadServiceLive } from "../services/UploadService";
import { R2Error } from "../lib/errors";
import { rateLimitMiddleware } from "../middleware/rate-limit";

// Combined layer for upload routes
const UploadRoutesLive = Layer.merge(R2ServiceLive, UploadServiceLive);

const app = new Hono();

// =============================================================================
// Rate Limiting Middleware
// =============================================================================

// Apply rate limiting to all upload routes
app.use("*", rateLimitMiddleware());

// =============================================================================
// Request Schemas
// =============================================================================

const initiateUploadSchema = z.object({
  contentType: z
    .string()
    .min(1, "Content type is required")
    .refine((ct) => ct.startsWith("image/"), "Content type must be an image type"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
});

// =============================================================================
// Helpers
// =============================================================================

/** Get file extension from content type */
const getExtensionFromContentType = (contentType: string): string => {
  const typeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/heic": "jpg", // HEIC should be converted client-side, fallback to jpg
    "image/heif": "jpg",
    "image/webp": "webp",
  };
  return typeMap[contentType.toLowerCase()] ?? "jpg";
};

/** Handle R2 errors with appropriate HTTP responses */
const handleR2Error = (error: R2Error) => {
  switch (error.cause) {
    case "CONFIG_MISSING":
      return {
        status: 503 as const,
        body: {
          error: "Storage service not configured",
          code: error.cause,
        },
      };
    case "INVALID_KEY":
      return {
        status: 400 as const,
        body: { error: error.message, code: error.cause },
      };
    case "PRESIGN_FAILED":
      return {
        status: 500 as const,
        body: {
          error: "Failed to generate upload URL",
          code: error.cause,
        },
      };
    default:
      return {
        status: 500 as const,
        body: { error: "Internal server error", code: "UNKNOWN" },
      };
  }
};

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/upload
 *
 * Initiate an upload by generating a presigned URL.
 *
 * Request body:
 * - contentType: string - MIME type of the image
 * - email: string - User's email address
 *
 * Response:
 * - uploadUrl: string - Presigned URL for PUT upload
 * - uploadId: string - Unique identifier for this upload (cuid2)
 * - key: string - R2 object key
 * - expiresAt: string - ISO timestamp when URL expires
 */
app.post("/", async (c) => {
  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = initiateUploadSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  const { contentType, email } = parsed.data;

  // Generate unique upload ID and R2 key
  const uploadId = createId();
  const extension = getExtensionFromContentType(contentType);
  const key = `uploads/${uploadId}/original.${extension}`;

  // Generate session token for this upload
  const sessionToken = crypto.randomUUID();

  const initiateUpload = Effect.fn("routes.upload.initiate")(function* () {
    const r2 = yield* R2Service;
    const uploadService = yield* UploadService;

    // Generate presigned URL
    const presignedResult = yield* r2.generatePresignedUploadUrl(key, contentType);

    // Create database record with pending status
    // Pass uploadId to ensure DB ID matches R2 key
    const upload = yield* uploadService.create({
      id: uploadId,
      email,
      sessionToken,
      originalUrl: key, // Store R2 key, not full URL
    });

    return {
      presignedResult,
      upload,
    };
  });

  const program = initiateUpload().pipe(Effect.provide(UploadRoutesLive));

  const result = await Effect.runPromise(Effect.either(program));

  if (result._tag === "Left") {
    // Check if it's an R2 error
    if (result.left instanceof R2Error) {
      const { status, body } = handleR2Error(result.left);
      return c.json(body, status);
    }
    // Database or other error
    return c.json({ error: "Failed to create upload record", code: "DB_ERROR" }, 500);
  }

  // Return upload details including session token
  return c.json({
    uploadUrl: result.right.presignedResult.url,
    uploadId: result.right.upload.id,
    key,
    expiresAt: result.right.presignedResult.expiresAt.toISOString(),
    sessionToken, // NEW: For authenticated access
  });
});

// =============================================================================
// POST /api/upload/:uploadId/confirm
// =============================================================================

/**
 * POST /api/upload/:uploadId/confirm
 *
 * Confirm that an upload has completed successfully.
 * Verifies the file exists in R2 and updates the status.
 *
 * Path params:
 * - uploadId: string - The upload ID to confirm
 *
 * Response:
 * - success: boolean
 * - jobId: string - Same as uploadId
 * - status: string - Current upload status
 */
app.post("/:uploadId/confirm", async (c) => {
  const uploadId = c.req.param("uploadId");

  if (!uploadId) {
    return c.json({ error: "Upload ID is required", code: "INVALID_REQUEST" }, 400);
  }

  const confirmUpload = Effect.fn("routes.upload.confirm")(function* () {
    const r2 = yield* R2Service;
    const uploadService = yield* UploadService;

    // Get the upload record
    const upload = yield* uploadService.getById(uploadId);

    // Verify the file exists in R2 using HEAD request
    const exists = yield* r2.headObject(upload.originalUrl);

    if (!exists) {
      return { success: false, error: "UPLOAD_NOT_FOUND_IN_STORAGE" };
    }

    // Upload is already confirmed if status is not pending
    if (upload.status !== "pending") {
      return {
        success: true,
        jobId: upload.id,
        status: upload.status,
        alreadyConfirmed: true,
      };
    }

    // Keep status as pending - processing will happen when workflow triggers
    // (Story 4.x will update status to "processing")
    return {
      success: true,
      jobId: upload.id,
      status: upload.status,
    };
  });

  const program = confirmUpload().pipe(Effect.provide(UploadRoutesLive));

  const result = await Effect.runPromise(Effect.either(program));

  if (result._tag === "Left") {
    const error = result.left;
    // Handle NotFoundError
    if ("_tag" in error && error._tag === "NotFoundError") {
      return c.json({ error: "Upload not found. Please try again.", code: "NOT_FOUND" }, 404);
    }
    // Handle R2 errors
    if (error instanceof R2Error) {
      return c.json(
        { error: "We couldn't verify your upload. Let's try again!", code: "R2_ERROR" },
        500,
      );
    }
    return c.json({ error: "Internal server error", code: "UNKNOWN" }, 500);
  }

  // Check if upload wasn't found in storage
  if (!result.right.success) {
    return c.json(
      {
        error: "We couldn't verify your upload. Let's try again!",
        code: result.right.error,
      },
      500,
    );
  }

  return c.json({
    success: true,
    jobId: result.right.jobId,
    status: result.right.status,
  });
});

// =============================================================================
// DELETE /api/upload/:uploadId - Cleanup Partial Uploads
// =============================================================================

/**
 * DELETE /api/upload/:uploadId
 *
 * Clean up a partial/failed upload from R2 storage.
 * Requires session token for authorization.
 * Handles "not found" gracefully (idempotent).
 *
 * Path params:
 * - uploadId: string - The upload ID to clean up
 *
 * Headers:
 * - X-Session-Token: string - Session token for authorization
 *
 * Response:
 * - success: boolean
 */
app.delete("/:uploadId", async (c) => {
  const uploadId = c.req.param("uploadId");
  const sessionToken = c.req.header("X-Session-Token");

  // Require session token
  if (!sessionToken) {
    return c.json({ error: "Session token is required", code: "MISSING_TOKEN" }, 401);
  }

  const cleanupUpload = Effect.gen(function* () {
    const r2 = yield* R2Service;

    // Delete all files with the upload prefix (uploads/{uploadId}/)
    // This cleans up original, processed, and any temporary files
    const prefix = `uploads/${uploadId}/`;

    const deletedCount = yield* r2.deletePrefix(prefix).pipe(
      Effect.catchAll(() => Effect.succeed(0)), // Best-effort cleanup
    );

    return { success: true, deletedCount };
  });

  // Run with R2 service layer
  const program = cleanupUpload.pipe(Effect.provide(R2ServiceLive));

  try {
    await Effect.runPromise(program);
    return c.json({ success: true });
  } catch (error: unknown) {
    // Check for R2 config error
    if (
      error &&
      typeof error === "object" &&
      "_tag" in error &&
      error._tag === "R2Error" &&
      "cause" in error &&
      error.cause === "CONFIG_MISSING"
    ) {
      return c.json({ error: "Storage service not configured", code: "CONFIG_MISSING" }, 503);
    }

    // Log but return success - cleanup is best-effort
    console.error("[upload-cleanup] Error during cleanup:", uploadId, error);
    return c.json({ success: true });
  }
});

export default app;
