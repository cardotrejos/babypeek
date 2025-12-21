import { Hono } from "hono"
import { Effect } from "effect"
import { createId } from "@paralleldrive/cuid2"
import { z } from "zod"

import { R2Service, R2ServiceLive } from "../services/R2Service"
import { R2Error } from "../lib/errors"

const app = new Hono()

// =============================================================================
// Request Schemas
// =============================================================================

const initiateUploadSchema = z.object({
  contentType: z
    .string()
    .min(1, "Content type is required")
    .refine(
      (ct) => ct.startsWith("image/"),
      "Content type must be an image type"
    ),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format"),
})

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
  }
  return typeMap[contentType.toLowerCase()] ?? "jpg"
}

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
      }
    case "INVALID_KEY":
      return {
        status: 400 as const,
        body: { error: error.message, code: error.cause },
      }
    case "PRESIGN_FAILED":
      return {
        status: 500 as const,
        body: {
          error: "Failed to generate upload URL",
          code: error.cause,
        },
      }
    default:
      return {
        status: 500 as const,
        body: { error: "Internal server error", code: "UNKNOWN" },
      }
  }
}

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
  const body = await c.req.json().catch(() => ({}))
  const parsed = initiateUploadSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      },
      400
    )
  }

  const { contentType, email } = parsed.data

  // Generate unique upload ID and R2 key
  const uploadId = createId()
  const extension = getExtensionFromContentType(contentType)
  const key = `uploads/${uploadId}/original.${extension}`

  // Generate presigned upload URL
  const program = Effect.gen(function* () {
    const r2 = yield* R2Service
    return yield* r2.generatePresignedUploadUrl(key, contentType)
  }).pipe(Effect.provide(R2ServiceLive))

  const result = await Effect.runPromise(Effect.either(program))

  if (result._tag === "Left") {
    const { status, body } = handleR2Error(result.left)
    return c.json(body, status)
  }

  // Return upload details
  return c.json({
    uploadUrl: result.right.url,
    uploadId,
    key,
    expiresAt: result.right.expiresAt.toISOString(),
    // Note: email is accepted but not stored yet
    // Story 3.6 will create the database record with session token
  })
})

export default app
