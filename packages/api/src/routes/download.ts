import { Hono } from "hono"
import { Effect } from "effect"
import { eq } from "drizzle-orm"
import { db, uploads } from "@3d-ultra/db"
import { R2Service, R2ServiceLive } from "../services/R2Service"
import { PurchaseService, PurchaseServiceLive } from "../services/PurchaseService"
import { DownloadService, DownloadServiceLive } from "../services/DownloadService"
import { StripeServiceLive } from "../services/StripeService"
import { NotFoundError, UnauthorizedError, DownloadExpiredError } from "../lib/errors"
import { captureException, addBreadcrumb } from "../middleware/sentry"
import { captureEvent } from "../services/PostHogService"
import { hashIP } from "../lib/hash"

const app = new Hono()

/**
 * GET /api/download/:uploadId
 * Returns presigned URL for HD image download
 * 
 * Story 7.1: HD Image Retrieval (base endpoint)
 * Story 7.2: Signed Download URL Generation (enhanced response)
 * 
 * Requires:
 * - X-Session-Token header matching upload record
 * - Completed purchase for the upload
 * 
 * Story 7.1 ACs:
 * AC-1: Full-resolution image available after purchase
 * AC-2: Image is not watermarked (returns full.jpg, not preview)
 * AC-3: Maximum quality from AI generation
 * AC-4: Access verified via sessionToken + purchase record
 * AC-5: Unauthorized requests return 401/403 with warm error message
 * 
 * Story 7.2 ACs:
 * AC-1: Signed URL with 7-day expiration, expiresInDays, expiryMessage, suggestedFilename
 * AC-2: Non-guessable IDs (cuid2)
 * AC-3: Unauthorized access returns 403
 * AC-4: Signed URLs via R2Service
 * AC-5: URL expiration enforced by R2/S3 presigning
 */
app.get("/:uploadId", async (c) => {
  const uploadId = c.req.param("uploadId")
  const token = c.req.header("X-Session-Token")

  // Add breadcrumb for download attempt
  addBreadcrumb("Download requested", "download", { uploadId, hasToken: !!token })

  // AC-4, AC-5: Verify session token present
  if (!token) {
    // Log unauthorized attempt to Sentry (no PII - just uploadId)
    addBreadcrumb("Download unauthorized - missing token", "download", { uploadId })
    return c.json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Session token required" }
    }, 401)
  }

  const program = Effect.gen(function* () {
    // Get upload record and validate session token
    const upload = yield* Effect.promise(() =>
      db.query.uploads.findFirst({
        where: eq(uploads.id, uploadId),
      })
    )

    if (!upload) {
      return yield* Effect.fail(new NotFoundError({ resource: "upload", id: uploadId }))
    }

    // AC-4: Validate session token matches
    if (upload.sessionToken !== token) {
      // Log unauthorized attempt to Sentry (no PII)
      addBreadcrumb("Download unauthorized - invalid token", "download", { uploadId })
      return yield* Effect.fail(new UnauthorizedError({ reason: "INVALID_TOKEN" }))
    }

    // Verify result exists (upload must be completed)
    if (!upload.resultUrl || upload.status !== "completed") {
      return yield* Effect.fail(new NotFoundError({ resource: "result", id: uploadId }))
    }

    // AC-4: Verify purchase exists
    const purchaseService = yield* PurchaseService
    const purchase = yield* purchaseService.getByUploadId(uploadId)

    if (!purchase || purchase.status !== "completed") {
      // Log unauthorized download attempt to Sentry (no PII)
      addBreadcrumb("Download unauthorized - no purchase", "download", { uploadId })
      return yield* Effect.fail(new UnauthorizedError({ reason: "PURCHASE_REQUIRED" }))
    }

    // Story 7.5 AC-1, AC-3: Check 30-day download window
    const purchaseDate = new Date(purchase.createdAt)
    const expiryDate = new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const now = new Date()

    if (now > expiryDate) {
      addBreadcrumb("Download expired - past 30-day window", "download", { uploadId })
      return yield* Effect.fail(new DownloadExpiredError({
        uploadId,
        expiredAt: expiryDate.toISOString(),
      }))
    }

    // Story 7.6 AC-4: Extract client IP for hashing (never store raw)
    const clientIP = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || 
                     c.req.header("x-real-ip") ||
                     undefined

    // Story 7.6 AC-2: Check if this is a re-download BEFORE recording new download
    const downloadService = yield* DownloadService
    const isRedownloadFlag = yield* downloadService.isRedownload(purchase.id)

    // Story 7.6 AC-3, AC-4: Record download in database
    const { downloadId, downloadCount } = yield* downloadService.recordDownload({
      purchaseId: purchase.id,
      clientIP,
    })

    // Story 7.6 AC-4: Check for abuse patterns (optional, doesn't block)
    const ipHash = clientIP ? hashIP(clientIP) : null
    if (ipHash) {
      const abuseCheck = yield* downloadService.checkAbusePattern(ipHash)
      if (abuseCheck.isAbusive) {
        // AC-4: Track abuse detection event (doesn't block download)
        captureEvent("download_abuse_detected", uploadId, {
          upload_id: uploadId,
          purchase_id: purchase.id,
          ip_hash: ipHash,
          download_count_last_hour: abuseCheck.count,
        })
        addBreadcrumb("Download abuse pattern detected", "download", { 
          uploadId, 
          downloadCountLastHour: abuseCheck.count 
        })
      }
    }

    // AC-1, AC-2, AC-3: Get HD image URL (full.jpg, not preview)
    // Validate and extract R2 key from resultUrl
    // Expected format: "results/{resultId}/full.jpg" or just resultId
    let r2Key: string
    if (upload.resultUrl.startsWith("results/") && upload.resultUrl.includes("/full.jpg")) {
      // Already a full path
      r2Key = upload.resultUrl
    } else if (upload.resultUrl.startsWith("results/")) {
      // Has prefix but missing full.jpg - append it
      r2Key = upload.resultUrl.endsWith("/") 
        ? `${upload.resultUrl}full.jpg`
        : `${upload.resultUrl}/full.jpg`
    } else {
      // Just a resultId - construct full path
      r2Key = `results/${upload.resultUrl}/full.jpg`
    }

    // Generate suggested filename with current date
    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD
    const suggestedFilename = `3d-ultra-baby-${today}.jpg`

    const r2Service = yield* R2Service
    const presignedUrl = yield* r2Service.generatePresignedDownloadUrl(r2Key, {
      filename: suggestedFilename,
    })

    // Calculate days until expiry (Story 7.2 AC-1)
    const expiresAt = presignedUrl.expiresAt
    const msUntilExpiry = expiresAt.getTime() - Date.now()
    const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24))

    // Story 7.6 AC-1, AC-2: Track download_initiated event with required fields
    // Extract resultId from r2Key (format: results/{resultId}/full.jpg)
    const resultIdMatch = r2Key.match(/results\/([^/]+)\//)
    const resultId = resultIdMatch?.[1] ?? uploadId
    
    captureEvent("download_initiated", uploadId, {
      upload_id: uploadId,
      result_id: resultId, // AC-2: Include resultId
      purchase_id: purchase.id,
      purchase_type: purchase.isGift ? "gift" : "self",
      is_redownload: isRedownloadFlag,
      download_count: downloadCount,
      ip_hash: ipHash,
      download_id: downloadId,
      r2_key: r2Key,
      expires_in_days: daysUntilExpiry,
    })

    addBreadcrumb("Download URL generated", "download", { uploadId, downloadId })

    return {
      success: true,
      downloadUrl: presignedUrl.url,
      expiresAt: expiresAt.toISOString(),
      expiresInDays: daysUntilExpiry,
      expiryMessage: `Link expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`,
      suggestedFilename,
      // Story 7.6: Include tracking info in response
      downloadCount,
      isRedownload: isRedownloadFlag,
    }
  })

  const resultEither = await Effect.runPromise(
    Effect.either(
      program.pipe(
        Effect.provide(R2ServiceLive),
        Effect.provide(PurchaseServiceLive),
        Effect.provide(DownloadServiceLive),
        Effect.provide(StripeServiceLive)
      )
    )
  )

  // Handle errors using Effect.either for proper typed error handling
  if (resultEither._tag === "Left") {
    const error = resultEither.left
    
    if (error._tag === "NotFoundError") {
      return c.json({
        success: false,
        error: { code: "NOT_FOUND", message: "We couldn't find your result. Try uploading again?" }
      }, 404)
    }
    
    if (error._tag === "UnauthorizedError") {
      if (error.reason === "PURCHASE_REQUIRED") {
        return c.json({
          success: false,
          error: { code: "PURCHASE_REQUIRED", message: "Purchase required to download HD photo" }
        }, 403)
      }
      return c.json({
        success: false,
        error: { code: "FORBIDDEN", message: "Session expired. Please start a new upload." }
      }, 403)
    }
    
    // Story 7.5 AC-3: Download expired after 30 days
    if (error._tag === "DownloadExpiredError") {
      return c.json({
        success: false,
        error: { 
          code: "DOWNLOAD_EXPIRED", 
          message: "Download expired. Downloads are available for 30 days after purchase.",
          expiredAt: error.expiredAt
        }
      }, 410)
    }
    
    if (error._tag === "R2Error") {
      // Log R2 errors to Sentry
      captureException(new Error(`R2 download error: ${error.message}`), { uploadId, cause: error.cause })
      return c.json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }
      }, 500)
    }
    
    // Unknown error - log to Sentry
    captureException(error instanceof Error ? error : new Error(String(error)), { uploadId })
    return c.json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." }
    }, 500)
  }

  // Success - return the download URL
  return c.json(resultEither.right)
})

/**
 * GET /api/download/:uploadId/status
 * Check if download is available (for re-download page)
 * 
 * Story 7.5: Re-Download Support
 * AC-1: Check purchase exists and is < 30 days old
 * AC-3: Return expiry info for expired downloads
 */
app.get("/:uploadId/status", async (c) => {
  const uploadId = c.req.param("uploadId")
  const token = c.req.header("X-Session-Token")

  addBreadcrumb("Download status check", "download", { uploadId, hasToken: !!token })

  if (!token) {
    return c.json({ 
      canDownload: false, 
      isExpired: false,
      error: { code: "UNAUTHORIZED", message: "Session token required" }
    }, 401)
  }

  const program = Effect.gen(function* () {
    // Get upload record and validate session token
    const upload = yield* Effect.promise(() =>
      db.query.uploads.findFirst({
        where: eq(uploads.id, uploadId),
      })
    )

    if (!upload) {
      return { 
        canDownload: false, 
        isExpired: false, 
        expiresAt: null,
        daysRemaining: null,
        error: { code: "NOT_FOUND", message: "Upload not found" }
      }
    }

    // Validate session token matches
    if (upload.sessionToken !== token) {
      return { 
        canDownload: false, 
        isExpired: false, 
        expiresAt: null,
        daysRemaining: null,
        error: { code: "FORBIDDEN", message: "Invalid session" }
      }
    }

    // Get purchase
    const purchaseService = yield* PurchaseService
    const purchase = yield* purchaseService.getByUploadId(uploadId)

    if (!purchase || purchase.status !== "completed") {
      return { 
        canDownload: false, 
        isExpired: false, 
        expiresAt: null,
        daysRemaining: null,
        error: { code: "PURCHASE_REQUIRED", message: "No purchase found" }
      }
    }

    // Story 7.5 AC-1, AC-3: Check 30-day window
    const purchaseDate = new Date(purchase.createdAt)
    const expiryDate = new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const now = new Date()

    if (now > expiryDate) {
      return {
        canDownload: false,
        isExpired: true,
        expiresAt: expiryDate.toISOString(),
        daysRemaining: null,
        error: { code: "DOWNLOAD_EXPIRED", expiredAt: expiryDate.toISOString() }
      }
    }

    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      canDownload: true,
      isExpired: false,
      expiresAt: expiryDate.toISOString(),
      daysRemaining,
    }
  })

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(PurchaseServiceLive),
      Effect.provide(StripeServiceLive)
    )
  )

  // Return appropriate status code based on result
  if (result.error?.code === "UNAUTHORIZED") {
    return c.json(result, 401)
  }
  if (result.error?.code === "FORBIDDEN") {
    return c.json(result, 403)
  }
  if (result.error?.code === "NOT_FOUND") {
    return c.json(result, 404)
  }
  
  return c.json(result)
})

export default app
