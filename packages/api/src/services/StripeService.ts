import { Effect, Context, Layer, Schedule } from "effect"
import Stripe from "stripe"
import { PaymentError } from "../lib/errors"
import { env, isStripeConfigured } from "../lib/env"

// Checkout session parameters
export interface CheckoutSessionParams {
  uploadId: string
  email: string
  type: "self" | "gift"
  successUrl: string
  cancelUrl: string
}

// Stripe Service interface
export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  {
    createCheckoutSession: (params: CheckoutSessionParams) => Effect.Effect<Stripe.Checkout.Session, PaymentError>
    constructWebhookEvent: (payload: string, signature: string) => Effect.Effect<Stripe.Event, PaymentError>
    retrieveSession: (sessionId: string) => Effect.Effect<Stripe.Checkout.Session, PaymentError>
  }
>() {}

// Cached Stripe client
let cachedStripe: Stripe | null = null

const getStripeClient = (): Effect.Effect<Stripe, PaymentError> => {
  if (!isStripeConfigured()) {
    return Effect.fail(
      new PaymentError({
        cause: "STRIPE_ERROR",
        message: "Stripe not configured - missing STRIPE_SECRET_KEY",
      })
    )
  }

  if (!cachedStripe) {
    cachedStripe = new Stripe(env.STRIPE_SECRET_KEY!)
  }

  return Effect.succeed(cachedStripe)
}

// Stripe Service implementation
export const StripeServiceLive = Layer.succeed(StripeService, {
  createCheckoutSession: (params) =>
    getStripeClient().pipe(
      Effect.flatMap((stripe) =>
        Effect.tryPromise({
          try: () =>
            stripe.checkout.sessions.create({
              payment_method_types: ["card"],
              line_items: [
                {
                  price_data: {
                    currency: "usd",
                    product_data: { name: "3d-ultra HD Photo" },
                    unit_amount: env.PRODUCT_PRICE_CENTS,
                  },
                  quantity: 1,
                },
              ],
              mode: "payment",
              success_url: params.successUrl,
              cancel_url: params.cancelUrl,
              customer_email: params.email,
              metadata: {
                uploadId: params.uploadId,
                email: params.email,
                type: params.type,
              },
            }),
          catch: (e) =>
            new PaymentError({
              cause: "STRIPE_ERROR",
              message: String(e),
            }),
        })
      ),
      Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
      Effect.timeout("30 seconds"),
      Effect.catchTag("TimeoutException", () =>
        Effect.fail(new PaymentError({ cause: "STRIPE_ERROR", message: "Stripe API timed out" }))
      )
    ),

  constructWebhookEvent: (payload, signature) =>
    getStripeClient().pipe(
      Effect.flatMap((stripe) => {
        if (!env.STRIPE_WEBHOOK_SECRET) {
          return Effect.fail(
            new PaymentError({ cause: "WEBHOOK_INVALID", message: "Webhook secret not configured" })
          )
        }
        return Effect.try({
          try: () => stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET!),
          catch: () =>
            new PaymentError({
              cause: "WEBHOOK_INVALID",
              message: "Invalid webhook signature",
            }),
        })
      })
    ),

  retrieveSession: (sessionId) =>
    getStripeClient().pipe(
      Effect.flatMap((stripe) =>
        Effect.tryPromise({
          try: () => stripe.checkout.sessions.retrieve(sessionId),
          catch: (e) =>
            new PaymentError({
              cause: "STRIPE_ERROR",
              message: String(e),
            }),
        })
      ),
      Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
      Effect.timeout("30 seconds"),
      Effect.catchTag("TimeoutException", () =>
        Effect.fail(new PaymentError({ cause: "STRIPE_ERROR", message: "Stripe API timed out" }))
      )
    ),
})
