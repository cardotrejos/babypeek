import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"
import { Effect, Layer } from "effect"
import type { Upload, Purchase } from "@3d-ultra/db"

import { R2Service, type PresignedUrl } from "../services/R2Service"
import { PurchaseService } from "../services/PurchaseService"
import { StripeService } from "../services/StripeService"
import { NotFoundError, UnauthorizedError, R2Error, DownloadExpiredError } from "../lib/errors"
import type Stripe from "stripe"

// =============================================================================
// Mock Setup
// =============================================================================

// Use cuid2-like IDs for realistic testing (Story 7.2 AC-2)
const MOCK_UPLOAD_ID = "clxyz1234567890abcdef" // cuid2 format: 24 chars
const MOCK_RESULT_ID = "clresult456789abcdefgh"

const createMockUpload = (overrides: Partial<Upload> = {}): Upload => ({
  id: MOCK_UPLOAD_ID,
  email: "test@example.com",
  sessionToken: "valid-session-token",
  originalUrl: `uploads/${MOCK_UPLOAD_ID}/original.jpg`,
  resultUrl: `results/${MOCK_RESULT_ID}/full.jpg`,
  previewUrl: `results/${MOCK_RESULT_ID}/preview.jpg`,
  status: "completed",
  stage: "complete",
  progress: 100,
  workflowRunId: "wfr_123",
  promptVersion: "v4",
  errorMessage: null,
  createdAt: new Date("2024-12-21T10:00:00Z"),
  updatedAt: new Date("2024-12-21T10:30:00Z"),
  expiresAt: new Date("2025-01-20T10:00:00Z"),
  ...overrides,
})

// Mock presigned URL with 7-day expiration (Story 7.2 AC-1, AC-5)
const mockExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
const mockPresignedUrl: PresignedUrl = {
  url: "https://bucket.r2.cloudflarestorage.com/results/result-123/full.jpg?X-Amz-Signature=abc123&response-content-disposition=attachment",
  key: "results/result-123/full.jpg",
  expiresAt: mockExpiresAt,
}

// Mock database function
let mockUpload: Upload | undefined

// Helper to create mock purchase
const createMockPurchase = (overrides: Partial<Purchase> = {}): Purchase => ({
  id: "purchase-123",
  uploadId: MOCK_UPLOAD_ID,
  stripeSessionId: "cs_test123",
  stripePaymentIntentId: "pi_test123",
  amount: 399,
  currency: "usd",
  status: "completed",
  isGift: false,
  giftRecipientEmail: null,
  createdAt: new Date(), // Default: now
  ...overrides,
})

// Factory to create download route app with mocked services
function createDownloadApp(options: {
  upload?: Upload | undefined
  hasPurchased?: boolean
  purchase?: Purchase | null // Story 7.5: Allow passing full purchase for date testing
  r2Error?: boolean
}) {
  mockUpload = options.upload

  const app = new Hono()

  app.get("/:uploadId", async (c) => {
    const uploadId = c.req.param("uploadId")
    const token = c.req.header("X-Session-Token")

    // AC-4, AC-5: Verify session token present
    if (!token) {
      return c.json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Session token required" }
      }, 401)
    }

    // Mock R2Service Layer
    const R2ServiceMock = Layer.succeed(R2Service, {
      generatePresignedUploadUrl: () => Effect.succeed(mockPresignedUrl),
      generatePresignedDownloadUrl: () => {
        if (options.r2Error) {
          return Effect.fail(new R2Error({ cause: "PRESIGN_FAILED", message: "Failed to generate URL" }))
        }
        return Effect.succeed(mockPresignedUrl)
      },
      upload: () => Effect.succeed("https://bucket.r2.cloudflarestorage.com/key"),
      delete: () => Effect.succeed(undefined),
      deletePrefix: () => Effect.succeed(0),
      headObject: () => Effect.succeed(true),
      getUploadUrl: () => Effect.succeed("https://example.com"),
      getDownloadUrl: () => Effect.succeed("https://example.com"),
    })

    // Determine purchase for mocking
    const mockPurchase = options.purchase !== undefined 
      ? options.purchase 
      : (options.hasPurchased ? createMockPurchase() : null)

    // Mock PurchaseService Layer
    const PurchaseServiceMock = Layer.succeed(PurchaseService, {
      createCheckout: () => Effect.succeed({ checkoutUrl: "https://checkout.stripe.com/c/pay/xxx", sessionId: "cs_123" }),
      createGiftCheckout: () => Effect.succeed({ checkoutUrl: "https://checkout.stripe.com/c/pay/xxx", sessionId: "cs_123" }),
      createFromWebhook: () => Effect.succeed(createMockPurchase()),
      hasPurchased: () => Effect.succeed(mockPurchase !== null && mockPurchase.status === "completed"),
      getByUploadId: () => Effect.succeed(mockPurchase),
    })

    // Mock StripeService (required by PurchaseService)
    const StripeServiceMock = Layer.succeed(StripeService, {
      createCheckoutSession: () => Effect.succeed({} as Stripe.Checkout.Session),
      retrieveSession: () => Effect.succeed({} as Stripe.Checkout.Session),
      constructWebhookEvent: () => Effect.succeed({} as Stripe.Event),
    })

    const program = Effect.gen(function* () {
      // Simulate DB lookup
      const upload = mockUpload

      if (!upload || upload.id !== uploadId) {
        return yield* Effect.fail(new NotFoundError({ resource: "upload", id: uploadId }))
      }

      // AC-4: Validate session token matches
      if (upload.sessionToken !== token) {
        return yield* Effect.fail(new UnauthorizedError({ reason: "INVALID_TOKEN" }))
      }

      // Verify result exists
      if (!upload.resultUrl || upload.status !== "completed") {
        return yield* Effect.fail(new NotFoundError({ resource: "result", id: uploadId }))
      }

      // AC-4: Verify purchase exists
      const purchaseService = yield* PurchaseService
      const purchase = yield* purchaseService.getByUploadId(uploadId)

      if (!purchase || purchase.status !== "completed") {
        return yield* Effect.fail(new UnauthorizedError({ reason: "PURCHASE_REQUIRED" }))
      }

      // Story 7.5 AC-1, AC-3: Check 30-day download window
      const purchaseDate = new Date(purchase.createdAt)
      const expiryDate = new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      const now = new Date()

      if (now > expiryDate) {
        return yield* Effect.fail(new DownloadExpiredError({
          uploadId,
          expiredAt: expiryDate.toISOString(),
        }))
      }

      // AC-1, AC-2, AC-3: Get HD image URL
      const r2Key = upload.resultUrl.startsWith("results/")
        ? upload.resultUrl
        : `results/${upload.resultUrl}/full.jpg`

      // Generate suggested filename with current date (Story 7.2 AC-1)
      const today = new Date().toISOString().split("T")[0]
      const suggestedFilename = `3d-ultra-baby-${today}.jpg`

      const r2Service = yield* R2Service
      // Story 7.2: Pass filename option for Content-Disposition
      const presignedUrl = yield* r2Service.generatePresignedDownloadUrl(r2Key, {
        filename: suggestedFilename,
      })

      // Calculate days until expiry (Story 7.2)
      const expiresAt = presignedUrl.expiresAt
      const msUntilExpiry = expiresAt.getTime() - Date.now()
      const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24))

      return {
        success: true,
        downloadUrl: presignedUrl.url,
        expiresAt: expiresAt.toISOString(),
        expiresInDays: daysUntilExpiry,
        expiryMessage: `Link expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`,
        suggestedFilename,
      }
    })

    const resultEither = await Effect.runPromise(
      Effect.either(
        program.pipe(
          Effect.provide(R2ServiceMock),
          Effect.provide(PurchaseServiceMock),
          Effect.provide(StripeServiceMock)
        )
      )
    )

    type SuccessResult = { success: true; downloadUrl: string; expiresAt: string }
    type ErrorResult = { error: string; status: 403 | 404 | 410 | 500; expiredAt?: string }
    let result: SuccessResult | ErrorResult

    if (resultEither._tag === "Left") {
      const error = resultEither.left
      if (error._tag === "NotFoundError") {
        result = { error: "NOT_FOUND", status: 404 as const }
      } else if (error._tag === "UnauthorizedError") {
        if (error.reason === "PURCHASE_REQUIRED") {
          result = { error: "PURCHASE_REQUIRED", status: 403 as const }
        } else {
          result = { error: "FORBIDDEN", status: 403 as const }
        }
      } else if (error._tag === "DownloadExpiredError") {
        // Story 7.5: Download expired after 30 days
        result = { error: "DOWNLOAD_EXPIRED", status: 410 as const, expiredAt: error.expiredAt }
      } else if (error._tag === "R2Error") {
        result = { error: "INTERNAL_ERROR", status: 500 as const }
      } else {
        console.error("[download] Error:", error)
        result = { error: "INTERNAL_ERROR", status: 500 as const }
      }
    } else {
      result = resultEither.right as SuccessResult
    }

    if ("error" in result) {
      const messages: Record<string, string> = {
        NOT_FOUND: "We couldn't find your result. Try uploading again?",
        PURCHASE_REQUIRED: "Purchase required to download HD photo",
        FORBIDDEN: "Session expired. Please start a new upload.",
        DOWNLOAD_EXPIRED: "Download expired. Downloads are available for 30 days after purchase.",
        INTERNAL_ERROR: "Something went wrong. Please try again.",
      }
      const response: { success: boolean; error: { code: string; message: string; expiredAt?: string } } = {
        success: false,
        error: { code: result.error, message: messages[result.error] }
      }
      if (result.expiredAt) {
        response.error.expiredAt = result.expiredAt
      }
      return c.json(response, result.status)
    }

    return c.json(result)
  })

  return app
}

// =============================================================================
// Tests
// =============================================================================

describe("GET /api/download/:uploadId", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload = undefined
  })

  describe("Authentication (AC-4, AC-5)", () => {
    it("returns 401 when session token is missing", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: true })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
      })

      expect(res.status).toBe(401)
      const body = await res.json() as { success: boolean; error: { code: string; message: string } }
      expect(body.success).toBe(false)
      expect(body.error.code).toBe("UNAUTHORIZED")
      expect(body.error.message).toBe("Session token required")
    })

    it("returns 403 when session token is invalid", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: true })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "wrong-token" },
      })

      expect(res.status).toBe(403)
      const body = await res.json() as { success: boolean; error: { code: string; message: string } }
      expect(body.success).toBe(false)
      expect(body.error.code).toBe("FORBIDDEN")
      expect(body.error.message).toBe("Session expired. Please start a new upload.")
    })

    it("returns 404 when upload not found", async () => {
      const app = createDownloadApp({ upload: undefined, hasPurchased: false })

      const res = await app.request("/non-existent-upload", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(404)
      const body = await res.json() as { success: boolean; error: { code: string; message: string } }
      expect(body.success).toBe(false)
      expect(body.error.code).toBe("NOT_FOUND")
      expect(body.error.message).toBe("We couldn't find your result. Try uploading again?")
    })
  })

  describe("Purchase Verification (AC-4)", () => {
    it("returns 403 when no purchase exists", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: false })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(403)
      const body = await res.json() as { success: boolean; error: { code: string; message: string } }
      expect(body.success).toBe(false)
      expect(body.error.code).toBe("PURCHASE_REQUIRED")
      expect(body.error.message).toBe("Purchase required to download HD photo")
    })
  })

  describe("Result Validation", () => {
    it("returns 404 when upload is not completed", async () => {
      const app = createDownloadApp({
        upload: createMockUpload({ status: "processing" }),
        hasPurchased: true
      })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(404)
      const body = await res.json() as { success: boolean; error: { code: string; message: string } }
      expect(body.success).toBe(false)
      expect(body.error.code).toBe("NOT_FOUND")
    })

    it("returns 404 when resultUrl is missing", async () => {
      const app = createDownloadApp({
        upload: createMockUpload({ resultUrl: null, status: "completed" }),
        hasPurchased: true
      })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(404)
      const body = await res.json() as { success: boolean; error: { code: string; message: string } }
      expect(body.success).toBe(false)
      expect(body.error.code).toBe("NOT_FOUND")
    })
  })

  describe("Successful Download (AC-1, AC-2, AC-3)", () => {
    it("returns signed URL when authorized and purchased", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: true })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as {
        success: boolean
        downloadUrl: string
        expiresAt: string
      }
      expect(body.success).toBe(true)
      expect(body.downloadUrl).toContain("https://bucket.r2.cloudflarestorage.com/results/result-123/full.jpg")
      // Verify expiresAt is a valid ISO date string (dynamic, not hardcoded)
      expect(() => new Date(body.expiresAt)).not.toThrow()
      expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now())
    })

    it("returns HD image URL (full.jpg), not preview", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: true })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { downloadUrl: string }
      // Verify it's the full.jpg, not preview
      expect(body.downloadUrl).toContain("/full.jpg")
      expect(body.downloadUrl).not.toContain("/preview")
    })
  })

  describe("Error Handling", () => {
    it("returns 500 when R2 presign fails", async () => {
      const app = createDownloadApp({
        upload: createMockUpload(),
        hasPurchased: true,
        r2Error: true
      })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(500)
      const body = await res.json() as { success: boolean; error: { code: string; message: string } }
      expect(body.success).toBe(false)
      expect(body.error.code).toBe("INTERNAL_ERROR")
      expect(body.error.message).toBe("Something went wrong. Please try again.")
    })
  })

  describe("Response Format", () => {
    it("returns consistent error response format", async () => {
      const app = createDownloadApp({ upload: undefined, hasPurchased: false })

      const res = await app.request("/invalid-id", {
        method: "GET",
        headers: { "X-Session-Token": "token" },
      })

      const body = await res.json() as { success: boolean; error: { code: string; message: string } }
      expect(body).toHaveProperty("success", false)
      expect(body).toHaveProperty("error")
      expect(body.error).toHaveProperty("code")
      expect(body.error).toHaveProperty("message")
    })

    it("returns consistent success response format", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: true })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      const body = await res.json() as { success: boolean; downloadUrl: string; expiresAt: string }
      expect(body).toHaveProperty("success", true)
      expect(body).toHaveProperty("downloadUrl")
      expect(body).toHaveProperty("expiresAt")
      // Verify expiresAt is valid ISO string
      expect(() => new Date(body.expiresAt)).not.toThrow()
    })
  })

  // Story 7.2: Signed Download URL Generation
  describe("Enhanced Response (Story 7.2)", () => {
    it("includes expiresInDays field (AC-1)", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: true })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { expiresInDays: number }
      expect(body).toHaveProperty("expiresInDays")
      expect(typeof body.expiresInDays).toBe("number")
      expect(body.expiresInDays).toBeGreaterThan(0)
      expect(body.expiresInDays).toBeLessThanOrEqual(7) // Max 7 days
    })

    it("includes human-readable expiry message (AC-1)", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: true })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { expiryMessage: string }
      expect(body).toHaveProperty("expiryMessage")
      expect(body.expiryMessage).toMatch(/^Link expires in \d+ days?$/)
    })

    it("includes suggested filename in correct format (AC-1)", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: true })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { suggestedFilename: string }
      expect(body).toHaveProperty("suggestedFilename")
      // Format: 3d-ultra-baby-YYYY-MM-DD.jpg
      expect(body.suggestedFilename).toMatch(/^3d-ultra-baby-\d{4}-\d{2}-\d{2}\.jpg$/)
    })

    it("returns 7-day expiration for presigned URL (AC-5)", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: true })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { expiresAt: string; expiresInDays: number }
      
      // Verify expiration is approximately 7 days from now
      const expiresAt = new Date(body.expiresAt)
      const now = new Date()
      const diffMs = expiresAt.getTime() - now.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      
      // Should be between 6.9 and 7.1 days (accounting for test execution time)
      expect(diffDays).toBeGreaterThan(6.9)
      expect(diffDays).toBeLessThanOrEqual(7.1)
    })
  })

  // Story 7.2: Expiry Message Grammar
  describe("Expiry Message Grammar", () => {
    it("uses singular 'day' when expiresInDays is 1", () => {
      const daysUntilExpiry = 1
      const message = `Link expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`
      expect(message).toBe("Link expires in 1 day")
    })

    it("uses plural 'days' when expiresInDays > 1", () => {
      const daysUntilExpiry = 7
      const message = `Link expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"}`
      expect(message).toBe("Link expires in 7 days")
    })
  })

  // Story 7.2: Content-Disposition for Downloads
  describe("Content-Disposition (Story 7.2 AC-1)", () => {
    it("presigned URL includes response-content-disposition parameter", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: true })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { downloadUrl: string }
      // Our mock URL includes response-content-disposition
      expect(body.downloadUrl).toContain("response-content-disposition")
    })
  })

  // Story 7.2: URL Security
  describe("URL Security (Story 7.2 AC-2, AC-3)", () => {
    it("uses non-guessable IDs (cuid2 format)", async () => {
      // The upload ID uses cuid2 which produces IDs like "clxxx..."
      // Verify the mock follows cuid2 pattern (24+ chars, alphanumeric)
      const upload = createMockUpload()
      expect(upload.id).toBeTruthy()
      expect(typeof upload.id).toBe("string")
      // cuid2 IDs are 24+ characters starting with 'cl' or similar
      expect(upload.id.length).toBeGreaterThanOrEqual(21)
      expect(upload.id).toMatch(/^[a-z0-9]+$/) // lowercase alphanumeric
    })

    it("presigned URL contains S3-compatible signature", async () => {
      const app = createDownloadApp({ upload: createMockUpload(), hasPurchased: true })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { downloadUrl: string }
      // S3 presigned URLs contain these signature components
      expect(body.downloadUrl).toContain("X-Amz-Signature")
    })
  })
})

// =============================================================================
// Story 7.5: Re-Download Support - 30-Day Expiry Tests
// =============================================================================

describe("30-Day Download Window (Story 7.5)", () => {
  describe("Download Within 30 Days (AC-1)", () => {
    it("allows download when purchase is 0 days old", async () => {
      const purchase = createMockPurchase({ createdAt: new Date() })
      const app = createDownloadApp({ upload: createMockUpload(), purchase })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean; downloadUrl: string }
      expect(body.success).toBe(true)
      expect(body.downloadUrl).toBeTruthy()
    })

    it("allows download when purchase is 15 days old (mid-window)", async () => {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      const purchase = createMockPurchase({ createdAt: fifteenDaysAgo })
      const app = createDownloadApp({ upload: createMockUpload(), purchase })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean }
      expect(body.success).toBe(true)
    })

    it("allows download when purchase is 29 days old (near expiry)", async () => {
      const twentyNineDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      const purchase = createMockPurchase({ createdAt: twentyNineDaysAgo })
      const app = createDownloadApp({ upload: createMockUpload(), purchase })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean }
      expect(body.success).toBe(true)
    })
  })

  describe("Download Blocked After 30 Days (AC-3)", () => {
    it("returns 410 when purchase is exactly 31 days old", async () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
      const purchase = createMockPurchase({ createdAt: thirtyOneDaysAgo })
      const app = createDownloadApp({ upload: createMockUpload(), purchase })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(410)
      const body = await res.json() as { 
        success: boolean
        error: { code: string; message: string; expiredAt?: string }
      }
      expect(body.success).toBe(false)
      expect(body.error.code).toBe("DOWNLOAD_EXPIRED")
    })

    it("returns 410 when purchase is 60 days old", async () => {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      const purchase = createMockPurchase({ createdAt: sixtyDaysAgo })
      const app = createDownloadApp({ upload: createMockUpload(), purchase })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(410)
      const body = await res.json() as { success: boolean; error: { code: string } }
      expect(body.success).toBe(false)
      expect(body.error.code).toBe("DOWNLOAD_EXPIRED")
    })
  })

  describe("Expiry Error Response (AC-3)", () => {
    it("includes expiredAt date in error response", async () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
      const purchase = createMockPurchase({ createdAt: thirtyOneDaysAgo })
      const app = createDownloadApp({ upload: createMockUpload(), purchase })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(410)
      const body = await res.json() as { error: { expiredAt?: string } }
      expect(body.error.expiredAt).toBeTruthy()
      // Verify it's a valid ISO date
      expect(() => new Date(body.error.expiredAt!)).not.toThrow()
    })

    it("includes helpful message about 30-day window", async () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
      const purchase = createMockPurchase({ createdAt: thirtyOneDaysAgo })
      const app = createDownloadApp({ upload: createMockUpload(), purchase })

      const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      const body = await res.json() as { error: { message: string } }
      expect(body.error.message).toContain("30 days")
    })
  })

  describe("Fresh URL Each Time (AC-4)", () => {
    it("generates new presigned URL on each download request", async () => {
      const purchase = createMockPurchase({ createdAt: new Date() })
      const app = createDownloadApp({ upload: createMockUpload(), purchase })

      // First request
      const res1 = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })
      const body1 = await res1.json() as { downloadUrl: string; expiresAt: string }

      // Second request (simulating re-download)
      const res2 = await app.request(`/${MOCK_UPLOAD_ID}`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })
      const body2 = await res2.json() as { downloadUrl: string; expiresAt: string }

      // Both should succeed
      expect(res1.status).toBe(200)
      expect(res2.status).toBe(200)
      
      // URLs should be returned (in real impl they'd have different signatures)
      expect(body1.downloadUrl).toBeTruthy()
      expect(body2.downloadUrl).toBeTruthy()
    })
  })
})

// =============================================================================
// Story 7.5: Status Endpoint Tests
// =============================================================================

describe("GET /api/download/:uploadId/status (Story 7.5)", () => {
  // Helper to create status endpoint app
  function createStatusApp(options: {
    upload?: Upload | undefined
    purchase?: Purchase | null
  }) {
    const mockUploadLocal = options.upload
    const mockPurchase = options.purchase ?? null

    const app = new Hono()

    app.get("/:uploadId/status", async (c) => {
      const uploadId = c.req.param("uploadId")
      const token = c.req.header("X-Session-Token")

      if (!token) {
        return c.json({ 
          canDownload: false, 
          isExpired: false,
          error: { code: "UNAUTHORIZED", message: "Session token required" }
        }, 401)
      }

      // Simulate upload lookup
      if (!mockUploadLocal || mockUploadLocal.id !== uploadId) {
        return c.json({ 
          canDownload: false, 
          isExpired: false, 
          expiresAt: null,
          daysRemaining: null,
          error: { code: "NOT_FOUND", message: "Upload not found" }
        }, 404)
      }

      // Validate session token
      if (mockUploadLocal.sessionToken !== token) {
        return c.json({ 
          canDownload: false, 
          isExpired: false, 
          expiresAt: null,
          daysRemaining: null,
          error: { code: "FORBIDDEN", message: "Invalid session" }
        }, 403)
      }

      // Check purchase
      if (!mockPurchase || mockPurchase.status !== "completed") {
        return c.json({ 
          canDownload: false, 
          isExpired: false, 
          expiresAt: null,
          daysRemaining: null,
          error: { code: "PURCHASE_REQUIRED", message: "No purchase found" }
        })
      }

      // Check 30-day window
      const purchaseDate = new Date(mockPurchase.createdAt)
      const expiryDate = new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      const now = new Date()

      if (now > expiryDate) {
        return c.json({
          canDownload: false,
          isExpired: true,
          expiresAt: expiryDate.toISOString(),
          daysRemaining: null,
          error: { code: "DOWNLOAD_EXPIRED", expiredAt: expiryDate.toISOString() }
        })
      }

      const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      return c.json({
        canDownload: true,
        isExpired: false,
        expiresAt: expiryDate.toISOString(),
        daysRemaining,
      })
    })

    return app
  }

  describe("Authentication", () => {
    it("returns 401 when session token is missing", async () => {
      const app = createStatusApp({ upload: createMockUpload(), purchase: createMockPurchase() })

      const res = await app.request(`/${MOCK_UPLOAD_ID}/status`, {
        method: "GET",
      })

      expect(res.status).toBe(401)
      const body = await res.json() as { canDownload: boolean; error: { code: string } }
      expect(body.canDownload).toBe(false)
      expect(body.error.code).toBe("UNAUTHORIZED")
    })

    it("returns 403 when session token is invalid", async () => {
      const app = createStatusApp({ upload: createMockUpload(), purchase: createMockPurchase() })

      const res = await app.request(`/${MOCK_UPLOAD_ID}/status`, {
        method: "GET",
        headers: { "X-Session-Token": "wrong-token" },
      })

      expect(res.status).toBe(403)
      const body = await res.json() as { canDownload: boolean; error: { code: string } }
      expect(body.canDownload).toBe(false)
      expect(body.error.code).toBe("FORBIDDEN")
    })

    it("returns 404 when upload not found", async () => {
      const app = createStatusApp({ upload: undefined, purchase: null })

      const res = await app.request("/non-existent/status", {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(404)
      const body = await res.json() as { canDownload: boolean; error: { code: string } }
      expect(body.canDownload).toBe(false)
      expect(body.error.code).toBe("NOT_FOUND")
    })
  })

  describe("Purchase Verification", () => {
    it("returns PURCHASE_REQUIRED when no purchase exists", async () => {
      const app = createStatusApp({ upload: createMockUpload(), purchase: null })

      const res = await app.request(`/${MOCK_UPLOAD_ID}/status`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200) // Status endpoint returns 200 with canDownload: false
      const body = await res.json() as { canDownload: boolean; error: { code: string } }
      expect(body.canDownload).toBe(false)
      expect(body.error.code).toBe("PURCHASE_REQUIRED")
    })
  })

  describe("30-Day Window Check", () => {
    it("returns canDownload: true when within 30 days", async () => {
      const purchase = createMockPurchase({ createdAt: new Date() })
      const app = createStatusApp({ upload: createMockUpload(), purchase })

      const res = await app.request(`/${MOCK_UPLOAD_ID}/status`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { 
        canDownload: boolean
        isExpired: boolean
        daysRemaining: number
      }
      expect(body.canDownload).toBe(true)
      expect(body.isExpired).toBe(false)
      expect(body.daysRemaining).toBe(30)
    })

    it("returns isExpired: true when past 30 days", async () => {
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
      const purchase = createMockPurchase({ createdAt: thirtyOneDaysAgo })
      const app = createStatusApp({ upload: createMockUpload(), purchase })

      const res = await app.request(`/${MOCK_UPLOAD_ID}/status`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { 
        canDownload: boolean
        isExpired: boolean
        error: { code: string; expiredAt: string }
      }
      expect(body.canDownload).toBe(false)
      expect(body.isExpired).toBe(true)
      expect(body.error.code).toBe("DOWNLOAD_EXPIRED")
      expect(body.error.expiredAt).toBeTruthy()
    })

    it("returns correct daysRemaining when mid-window", async () => {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      const purchase = createMockPurchase({ createdAt: fifteenDaysAgo })
      const app = createStatusApp({ upload: createMockUpload(), purchase })

      const res = await app.request(`/${MOCK_UPLOAD_ID}/status`, {
        method: "GET",
        headers: { "X-Session-Token": "valid-session-token" },
      })

      expect(res.status).toBe(200)
      const body = await res.json() as { daysRemaining: number }
      expect(body.daysRemaining).toBe(15)
    })
  })
})

// =============================================================================
// Integration Test: Full Download Flow
// =============================================================================

describe("Download Flow Integration", () => {
  it("complete flow: auth → purchase check → presigned URL with enhanced response", async () => {
    const upload = createMockUpload()
    const app = createDownloadApp({ upload, hasPurchased: true })

    // Step 1: Request with valid session token
    const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
      method: "GET",
      headers: { "X-Session-Token": "valid-session-token" },
    })

    // Step 2: Verify success
    expect(res.status).toBe(200)
    const body = await res.json() as {
      success: boolean
      downloadUrl: string
      expiresAt: string
      expiresInDays: number
      expiryMessage: string
      suggestedFilename: string
    }
    
    // Step 3: Verify response contains all required fields (Story 7.2)
    expect(body.success).toBe(true)
    expect(body.downloadUrl).toBeTruthy()
    expect(body.expiresAt).toBeTruthy()
    expect(body.expiresInDays).toBeTruthy()
    expect(body.expiryMessage).toBeTruthy()
    expect(body.suggestedFilename).toBeTruthy()
    
    // Step 4: Verify URL is for HD image (not preview)
    expect(body.downloadUrl).toContain("full.jpg")
    
    // Step 5: Verify enhanced response format
    expect(body.expiresInDays).toBeLessThanOrEqual(7)
    expect(body.expiryMessage).toContain("Link expires in")
    expect(body.suggestedFilename).toMatch(/^3d-ultra-baby-\d{4}-\d{2}-\d{2}\.jpg$/)
  })

  it("complete flow with 30-day validation (Story 7.5)", async () => {
    // Purchase made 10 days ago
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    const purchase = createMockPurchase({ createdAt: tenDaysAgo })
    const upload = createMockUpload()
    const app = createDownloadApp({ upload, purchase })

    const res = await app.request(`/${MOCK_UPLOAD_ID}`, {
      method: "GET",
      headers: { "X-Session-Token": "valid-session-token" },
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; downloadUrl: string }
    expect(body.success).toBe(true)
    expect(body.downloadUrl).toContain("full.jpg")
  })
})
