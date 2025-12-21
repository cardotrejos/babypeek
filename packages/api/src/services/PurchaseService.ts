import { Effect, Context, Layer } from "effect"
import { eq, and } from "drizzle-orm"
import { db, uploads, purchases } from "@3d-ultra/db"
import { StripeService } from "./StripeService"
import { NotFoundError, PaymentError, ValidationError } from "../lib/errors"
import { env } from "../lib/env"

// Purchase Service interface
export class PurchaseService extends Context.Tag("PurchaseService")<
  PurchaseService,
  {
    /**
     * Create a Stripe checkout session for an upload.
     * Validates the upload exists and is completed before creating session.
     * 
     * @param uploadId - The upload ID to purchase
     * @param type - "self" or "gift" purchase
     * @returns Checkout session URL for redirect
     */
    createCheckout: (
      uploadId: string,
      type: "self" | "gift"
    ) => Effect.Effect<{ checkoutUrl: string; sessionId: string }, NotFoundError | PaymentError | ValidationError>
  }
>() {}

/**
 * Create checkout session using injected StripeService instance.
 * Pattern matches ResultService for consistent dependency injection.
 */
const createCheckout = (stripeService: StripeService["Type"]) =>
  Effect.fn("PurchaseService.createCheckout")(function* (
    uploadId: string,
    type: "self" | "gift"
  ) {
    // Get upload record
    const upload = yield* Effect.promise(async () => {
      return db.query.uploads.findFirst({
        where: eq(uploads.id, uploadId),
      })
    })

    if (!upload) {
      return yield* Effect.fail(new NotFoundError({ resource: "upload", id: uploadId }))
    }

    // Validate upload is completed with result
    if (upload.status !== "completed" || !upload.resultUrl) {
      return yield* Effect.fail(
        new ValidationError({
          field: "uploadId",
          message: "Upload must be completed with a result before purchase",
        })
      )
    }

    // Check for existing pending purchase to prevent duplicates
    const existingPurchase = yield* Effect.promise(async () => {
      return db.query.purchases.findFirst({
        where: and(
          eq(purchases.uploadId, uploadId),
          eq(purchases.status, "pending")
        ),
      })
    })

    if (existingPurchase) {
      return yield* Effect.fail(
        new ValidationError({
          field: "uploadId",
          message: "A pending purchase already exists for this upload",
        })
      )
    }

    // Build success/cancel URLs
    const successUrl = `${env.APP_URL}/checkout-success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${env.APP_URL}/result/${uploadId}`

    // Create Stripe checkout session
    const session = yield* stripeService.createCheckoutSession({
      uploadId,
      email: upload.email,
      type,
      successUrl,
      cancelUrl,
    })

    // Create pending purchase record
    yield* Effect.promise(async () => {
      return db.insert(purchases).values({
        uploadId,
        stripeSessionId: session.id,
        amount: env.PRODUCT_PRICE_CENTS,
        currency: "usd",
        status: "pending",
        isGift: type === "gift",
      })
    })

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
    }
  })

// PurchaseService Live implementation - uses StripeService dependency
export const PurchaseServiceLive = Layer.effect(
  PurchaseService,
  Effect.gen(function* () {
    const stripeService = yield* StripeService

    return {
      createCheckout: createCheckout(stripeService),
    }
  })
)
