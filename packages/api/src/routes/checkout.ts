import { Hono } from "hono"
import { Effect, Layer } from "effect"
import { z } from "zod"

import { PurchaseService, PurchaseServiceLive } from "../services/PurchaseService"
import { StripeServiceLive } from "../services/StripeService"
import { NotFoundError, PaymentError, ValidationError } from "../lib/errors"

// Composed layer: PurchaseService needs StripeService
const CheckoutRoutesLive = PurchaseServiceLive.pipe(Layer.provide(StripeServiceLive))

const app = new Hono()

// Request schema
const checkoutSchema = z.object({
  uploadId: z.string().min(1, "Upload ID is required"),
  type: z.enum(["self", "gift"]).default("self"),
})

/**
 * POST /api/checkout
 * 
 * Create a Stripe Checkout session for purchasing an HD image.
 * 
 * Request body:
 * - uploadId: string - The upload ID to purchase
 * - type: "self" | "gift" - Purchase type (default: "self")
 * 
 * Response:
 * - checkoutUrl: string - Stripe Checkout URL for redirect
 * - sessionId: string - Stripe session ID
 */
app.post("/", async (c) => {
  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}))
  const parsed = checkoutSchema.safeParse(body)

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      },
      400
    )
  }

  const { uploadId, type } = parsed.data

  const createCheckout = Effect.fn("routes.checkout.create")(function* () {
    const purchaseService = yield* PurchaseService
    return yield* purchaseService.createCheckout(uploadId, type)
  })

  const program = createCheckout().pipe(Effect.provide(CheckoutRoutesLive))

  const result = await Effect.runPromise(Effect.either(program))

  if (result._tag === "Left") {
    const error = result.left

    if (error instanceof NotFoundError) {
      return c.json(
        { error: "Upload not found", code: "NOT_FOUND" },
        404
      )
    }

    if (error instanceof ValidationError) {
      return c.json(
        { error: error.message, code: "VALIDATION_ERROR", field: error.field },
        400
      )
    }

    if (error instanceof PaymentError) {
      return c.json(
        { error: "Payment service unavailable", code: error.cause },
        503
      )
    }

    return c.json({ error: "Internal server error", code: "UNKNOWN" }, 500)
  }

  return c.json({
    checkoutUrl: result.right.checkoutUrl,
    sessionId: result.right.sessionId,
  })
})

export default app
