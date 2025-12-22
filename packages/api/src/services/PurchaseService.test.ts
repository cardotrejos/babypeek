import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect, Layer } from "effect"
import { PurchaseService, PurchaseServiceLive, type CreatePurchaseParams } from "./PurchaseService"
import { StripeService } from "./StripeService"
import { NotFoundError, ValidationError, PaymentError } from "../lib/errors"
import { db } from "@babypeek/db"

// Mock database
vi.mock("@babypeek/db", () => ({
  db: {
    query: {
      uploads: {
        findFirst: vi.fn(),
      },
      purchases: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn(),
        }),
      }),
    }),
  },
  uploads: { id: "id", status: "status" },
  purchases: { uploadId: "uploadId", status: "status", stripeSessionId: "stripeSessionId" },
}))

// Mock env
vi.mock("../lib/env", () => ({
  env: {
    APP_URL: "http://localhost:3001",
    PRODUCT_PRICE_CENTS: 999,
  },
}))

describe("PurchaseService", () => {
  const mockStripeSession = {
    id: "cs_test_123",
    url: "https://checkout.stripe.com/session_123",
  }

  const mockStripeService = {
    createCheckoutSession: vi.fn(),
    constructWebhookEvent: vi.fn(),
    retrieveSession: vi.fn(),
  }

  // Create a mock StripeService layer
  const MockStripeServiceLive = Layer.succeed(StripeService, mockStripeService as unknown as StripeService["Type"])

  // Compose PurchaseService with mock StripeService
  const TestPurchaseServiceLive = PurchaseServiceLive.pipe(Layer.provide(MockStripeServiceLive))

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("createCheckout", () => {
    it("should create checkout session for completed upload", async () => {
      // Arrange - use any type to bypass strict type checking in tests
      const completedUpload = {
        id: "upload_123",
        email: "test@example.com",
        status: "completed" as const,
        resultUrl: "results/result_abc/full.jpg",
        sessionToken: "token_123",
        originalUrl: "uploads/upload_123/original.jpg",
        previewUrl: null,
        stage: null,
        progress: 100,
        workflowRunId: null,
        promptVersion: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }

      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(completedUpload)
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(undefined)

      mockStripeService.createCheckoutSession.mockReturnValue(
        Effect.succeed(mockStripeSession)
      )

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue([{ id: "purchase_123" }]),
      } as unknown as ReturnType<typeof db.insert>)

      // Act
      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createCheckout("upload_123", "self")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      // Assert
      expect(result).toEqual({
        checkoutUrl: mockStripeSession.url,
        sessionId: mockStripeSession.id,
      })

      // Cancel URL should use resultId extracted from resultUrl with cancelled=true param
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith({
        uploadId: "upload_123",
        email: "test@example.com",
        type: "self",
        successUrl: "http://localhost:3001/checkout-success?session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "http://localhost:3001/result/result_abc?cancelled=true",
      })
    })

    it("should fail if upload not found", async () => {
      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(undefined)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createCheckout("nonexistent", "self")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(Effect.either(program))

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(NotFoundError)
      }
    })

    it("should fail if upload not completed", async () => {
      const pendingUpload = {
        id: "upload_123",
        email: "test@example.com",
        status: "pending" as const,
        resultUrl: null,
        sessionToken: "token_123",
        originalUrl: "uploads/upload_123/original.jpg",
        previewUrl: null,
        stage: null,
        progress: 0,
        workflowRunId: null,
        promptVersion: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }

      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(pendingUpload)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createCheckout("upload_123", "self")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(Effect.either(program))

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError)
        expect((result.left as ValidationError).message).toContain("completed")
      }
    })

    it("should fail if pending purchase already exists", async () => {
      const completedUpload = {
        id: "upload_123",
        email: "test@example.com",
        status: "completed" as const,
        resultUrl: "results/result_abc/full.jpg",
        sessionToken: "token_123",
        originalUrl: "uploads/upload_123/original.jpg",
        previewUrl: null,
        stage: null,
        progress: 100,
        workflowRunId: null,
        promptVersion: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }

      const existingPurchase = {
        id: "purchase_existing",
        uploadId: "upload_123",
        status: "pending" as const,
        stripeSessionId: "cs_123",
        stripePaymentIntentId: null,
        amount: 999,
        currency: "usd",
        isGift: false,
        giftRecipientEmail: null,
        createdAt: new Date(),
      }

      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(completedUpload)
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(existingPurchase)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createCheckout("upload_123", "self")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(Effect.either(program))

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ValidationError)
        expect((result.left as ValidationError).message).toContain("pending purchase")
      }
    })

    it("should handle Stripe errors", async () => {
      const completedUpload = {
        id: "upload_123",
        email: "test@example.com",
        status: "completed" as const,
        resultUrl: "results/result_abc/full.jpg",
        sessionToken: "token_123",
        originalUrl: "uploads/upload_123/original.jpg",
        previewUrl: null,
        stage: null,
        progress: 100,
        workflowRunId: null,
        promptVersion: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }

      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(completedUpload)
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(undefined)

      mockStripeService.createCheckoutSession.mockReturnValue(
        Effect.fail(new PaymentError({ cause: "STRIPE_ERROR", message: "Stripe unavailable" }))
      )

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createCheckout("upload_123", "self")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(Effect.either(program))

      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(PaymentError)
      }
    })

    it("should support gift purchase type", async () => {
      const completedUpload = {
        id: "upload_123",
        email: "test@example.com",
        status: "completed" as const,
        resultUrl: "results/result_abc/full.jpg",
        sessionToken: "token_123",
        originalUrl: "uploads/upload_123/original.jpg",
        previewUrl: null,
        stage: null,
        progress: 100,
        workflowRunId: null,
        promptVersion: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }

      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(completedUpload)
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(undefined)

      mockStripeService.createCheckoutSession.mockReturnValue(
        Effect.succeed(mockStripeSession)
      )

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue([{ id: "purchase_123" }]),
      } as unknown as ReturnType<typeof db.insert>)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createCheckout("upload_123", "gift")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      await Effect.runPromise(program)

      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ type: "gift" })
      )
    })
  })

  describe("createFromWebhook", () => {
    const mockPurchaseParams: CreatePurchaseParams = {
      uploadId: "upload_123",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 999,
      currency: "usd",
      isGift: false,
    }

    const mockCreatedPurchase = {
      id: "purchase_123",
      uploadId: "upload_123",
      stripeSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_test_123",
      amount: 999,
      currency: "usd",
      status: "completed" as const,
      isGift: false,
      giftRecipientEmail: null,
      createdAt: new Date(),
    }

    it("should create purchase record with completed status (AC-1, AC-5)", async () => {
      // No existing purchase
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(undefined)
      
      // Mock insert returning
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockCreatedPurchase]),
        }),
      } as unknown as ReturnType<typeof db.insert>)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createFromWebhook(mockPurchaseParams)
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      expect(result.status).toBe("completed")
      expect(result.uploadId).toBe("upload_123")
      expect(result.amount).toBe(999)
    })

    it("should set type to 'self' for regular purchases (AC-2)", async () => {
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(undefined)
      
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockCreatedPurchase, isGift: false }]),
        }),
      } as unknown as ReturnType<typeof db.insert>)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createFromWebhook({ ...mockPurchaseParams, isGift: false })
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      expect(result.isGift).toBe(false)
    })

    it("should set type to 'gift' for gift purchases (AC-3)", async () => {
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(undefined)
      
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ 
            ...mockCreatedPurchase, 
            isGift: true,
            giftRecipientEmail: "recipient@example.com" 
          }]),
        }),
      } as unknown as ReturnType<typeof db.insert>)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createFromWebhook({ 
          ...mockPurchaseParams, 
          isGift: true,
          giftRecipientEmail: "recipient@example.com"
        })
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      expect(result.isGift).toBe(true)
      expect(result.giftRecipientEmail).toBe("recipient@example.com")
    })

    it("should be idempotent - return existing completed purchase", async () => {
      // Return existing completed purchase
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(mockCreatedPurchase)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createFromWebhook(mockPurchaseParams)
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      expect(result.id).toBe("purchase_123")
      // Should not call insert for existing completed purchase
      expect(db.insert).not.toHaveBeenCalled()
    })

    it("should update pending purchase to completed", async () => {
      const pendingPurchase = { ...mockCreatedPurchase, status: "pending" as const }
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(pendingPurchase)
      
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockCreatedPurchase, status: "completed" }]),
          }),
        }),
      } as unknown as ReturnType<typeof db.update>)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createFromWebhook(mockPurchaseParams)
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      expect(result.status).toBe("completed")
      expect(db.update).toHaveBeenCalled()
    })
  })

  describe("hasPurchased", () => {
    it("should return true for completed purchases (AC-6)", async () => {
      const completedPurchase = {
        id: "purchase_123",
        uploadId: "upload_123",
        status: "completed" as const,
        stripeSessionId: "cs_123",
        stripePaymentIntentId: "pi_123",
        amount: 999,
        currency: "usd",
        isGift: false,
        giftRecipientEmail: null,
        createdAt: new Date(),
      }

      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(completedPurchase)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.hasPurchased("upload_123")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      expect(result).toBe(true)
    })

    it("should return false for no purchase", async () => {
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(undefined)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.hasPurchased("upload_123")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      expect(result).toBe(false)
    })

    it("should return false for pending purchases", async () => {
      const pendingPurchase = {
        id: "purchase_123",
        uploadId: "upload_123",
        status: "pending" as const,
        stripeSessionId: "cs_123",
        stripePaymentIntentId: null,
        amount: 999,
        currency: "usd",
        isGift: false,
        giftRecipientEmail: null,
        createdAt: new Date(),
      }

      // Return undefined because the query filters by status: "completed"
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(undefined)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.hasPurchased("upload_123")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      expect(result).toBe(false)
    })
  })

  describe("getByUploadId", () => {
    it("should return purchase for upload", async () => {
      const purchase = {
        id: "purchase_123",
        uploadId: "upload_123",
        status: "completed" as const,
        stripeSessionId: "cs_123",
        stripePaymentIntentId: "pi_123",
        amount: 999,
        currency: "usd",
        isGift: false,
        giftRecipientEmail: null,
        createdAt: new Date(),
      }

      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(purchase)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.getByUploadId("upload_123")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      expect(result).toEqual(purchase)
    })

    it("should return null when no purchase exists", async () => {
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(undefined)

      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.getByUploadId("upload_123")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      expect(result).toBeNull()
    })
  })

  // Story 6.7: Gift Purchase Option Tests
  describe("createGiftCheckout", () => {
    it("should create gift checkout session with purchaser email", async () => {
      // Arrange
      const completedUpload = {
        id: "upload_123",
        email: "recipient@example.com", // Original uploader
        status: "completed" as const,
        resultUrl: "results/result_abc/full.jpg",
        sessionToken: "token_123",
        originalUrl: "uploads/upload_123/original.jpg",
        previewUrl: "results/result_abc/preview.jpg",
        stage: null,
        progress: 100,
        workflowRunId: null,
        promptVersion: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }

      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(completedUpload)

      mockStripeService.createCheckoutSession.mockReturnValue(
        Effect.succeed({
          id: "cs_gift_123",
          url: "https://checkout.stripe.com/gift_session",
        })
      )

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue([{ id: "purchase_gift_123" }]),
      } as unknown as ReturnType<typeof db.insert>)

      // Act
      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createGiftCheckout("upload_123", "purchaser@example.com")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      // Assert
      expect(result.checkoutUrl).toBe("https://checkout.stripe.com/gift_session")
      expect(result.sessionId).toBe("cs_gift_123")

      // Verify Stripe was called with gift params
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          uploadId: "upload_123",
          email: "recipient@example.com", // Recipient email
          type: "gift",
          purchaserEmail: "purchaser@example.com", // Purchaser email
        })
      )
    })

    it("should fail for non-completed upload", async () => {
      // Arrange
      const pendingUpload = {
        id: "upload_123",
        email: "test@example.com",
        status: "pending" as const,
        resultUrl: null,
        sessionToken: "token_123",
        originalUrl: "uploads/upload_123/original.jpg",
        previewUrl: null,
        stage: null,
        progress: 0,
        workflowRunId: null,
        promptVersion: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }

      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(pendingUpload)

      // Act
      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createGiftCheckout("upload_123", "purchaser@example.com")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      // Assert
      await expect(Effect.runPromise(program)).rejects.toThrow()
    })

    it("should fail for non-existent upload", async () => {
      // Arrange
      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(undefined)

      // Act
      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createGiftCheckout("nonexistent", "purchaser@example.com")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      // Assert
      await expect(Effect.runPromise(program)).rejects.toThrow()
    })

    it("should create purchase record with isGift=true", async () => {
      // Arrange
      const completedUpload = {
        id: "upload_456",
        email: "recipient@example.com",
        status: "completed" as const,
        resultUrl: "results/result_xyz/full.jpg",
        sessionToken: "token_456",
        originalUrl: "uploads/upload_456/original.jpg",
        previewUrl: "results/result_xyz/preview.jpg",
        stage: null,
        progress: 100,
        workflowRunId: null,
        promptVersion: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }

      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(completedUpload)

      mockStripeService.createCheckoutSession.mockReturnValue(
        Effect.succeed({
          id: "cs_gift_456",
          url: "https://checkout.stripe.com/gift_session_456",
        })
      )

      const insertValues = vi.fn().mockResolvedValue([{ id: "purchase_gift_456" }])
      vi.mocked(db.insert).mockReturnValue({
        values: insertValues,
      } as unknown as ReturnType<typeof db.insert>)

      // Act
      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createGiftCheckout("upload_456", "purchaser@example.com")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      await Effect.runPromise(program)

      // Assert - verify purchase was created with gift flags
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          uploadId: "upload_456",
          isGift: true,
          giftRecipientEmail: "recipient@example.com",
        })
      )
    })

    // M2 Fix: Test for duplicate gift purchase prevention
    it("should fail if pending purchase already exists (H2 fix)", async () => {
      // Arrange
      const completedUpload = {
        id: "upload_789",
        email: "recipient@example.com",
        status: "completed" as const,
        resultUrl: "results/result_xyz/full.jpg",
        sessionToken: "token_789",
        originalUrl: "uploads/upload_789/original.jpg",
        previewUrl: "results/result_xyz/preview.jpg",
        stage: null,
        progress: 100,
        workflowRunId: null,
        promptVersion: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }

      const existingPendingPurchase = {
        id: "purchase_existing",
        uploadId: "upload_789",
        status: "pending" as const,
        stripeSessionId: "cs_existing",
        stripePaymentIntentId: null,
        amount: 999,
        currency: "usd",
        isGift: true,
        giftRecipientEmail: "recipient@example.com",
        createdAt: new Date(),
      }

      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(completedUpload)
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(existingPendingPurchase)

      // Act
      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createGiftCheckout("upload_789", "purchaser@example.com")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      // Assert - should fail with validation error
      await expect(Effect.runPromise(program)).rejects.toThrow()
    })

    it("should succeed if no pending purchase exists for upload", async () => {
      // Arrange
      const completedUpload = {
        id: "upload_new",
        email: "recipient@example.com",
        status: "completed" as const,
        resultUrl: "results/result_new/full.jpg",
        sessionToken: "token_new",
        originalUrl: "uploads/upload_new/original.jpg",
        previewUrl: "results/result_new/preview.jpg",
        stage: null,
        progress: 100,
        workflowRunId: null,
        promptVersion: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
      }

      vi.mocked(db.query.uploads.findFirst).mockResolvedValue(completedUpload)
      vi.mocked(db.query.purchases.findFirst).mockResolvedValue(undefined) // No existing purchase

      mockStripeService.createCheckoutSession.mockReturnValue(
        Effect.succeed({
          id: "cs_new_gift",
          url: "https://checkout.stripe.com/new_gift_session",
        })
      )

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockResolvedValue([{ id: "purchase_new_gift" }]),
      } as unknown as ReturnType<typeof db.insert>)

      // Act
      const program = Effect.gen(function* () {
        const service = yield* PurchaseService
        return yield* service.createGiftCheckout("upload_new", "purchaser@example.com")
      }).pipe(Effect.provide(TestPurchaseServiceLive))

      const result = await Effect.runPromise(program)

      // Assert - should succeed
      expect(result.checkoutUrl).toBe("https://checkout.stripe.com/new_gift_session")
      expect(result.sessionId).toBe("cs_new_gift")
    })
  })
})
