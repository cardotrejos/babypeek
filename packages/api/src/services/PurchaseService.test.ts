import { describe, it, expect, vi, beforeEach } from "vitest"
import { Effect, Layer } from "effect"
import { PurchaseService, PurchaseServiceLive } from "./PurchaseService"
import { StripeService } from "./StripeService"
import { NotFoundError, ValidationError, PaymentError } from "../lib/errors"
import { db } from "@3d-ultra/db"

// Mock database
vi.mock("@3d-ultra/db", () => ({
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
      values: vi.fn(),
    }),
  },
  uploads: { id: "id", status: "status" },
  purchases: { uploadId: "uploadId", status: "status" },
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

      // Cancel URL should use resultId extracted from resultUrl
      expect(mockStripeService.createCheckoutSession).toHaveBeenCalledWith({
        uploadId: "upload_123",
        email: "test@example.com",
        type: "self",
        successUrl: "http://localhost:3001/checkout-success?session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "http://localhost:3001/result/result_abc",
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
})
