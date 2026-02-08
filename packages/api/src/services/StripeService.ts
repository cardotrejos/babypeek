import { Effect, Context, Layer, Schedule } from "effect";
import Stripe from "stripe";
import { PaymentError } from "../lib/errors";
import { env, isStripeConfigured } from "../lib/env";

// Checkout session parameters
export interface CheckoutSessionParams {
  uploadId: string;
  email: string; // Recipient email (original uploader for gifts)
  type: "self" | "gift";
  tier: string; // Pricing tier ID ("basic" | "plus" | "pro")
  priceCents: number; // Server-validated price for this tier
  successUrl: string;
  cancelUrl: string;
  purchaserEmail?: string; // Gift purchaser email (for receipt)
}

// Stripe Service interface
export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  {
    createCheckoutSession: (
      params: CheckoutSessionParams,
    ) => Effect.Effect<Stripe.Checkout.Session, PaymentError>;
    constructWebhookEvent: (
      payload: string,
      signature: string,
    ) => Effect.Effect<Stripe.Event, PaymentError>;
    retrieveSession: (sessionId: string) => Effect.Effect<Stripe.Checkout.Session, PaymentError>;
  }
>() {}

// Cached Stripe client
let cachedStripe: Stripe | null = null;

const getStripeClient = (): Effect.Effect<Stripe, PaymentError> => {
  if (!isStripeConfigured()) {
    return Effect.fail(
      new PaymentError({
        cause: "STRIPE_ERROR",
        message: "Stripe not configured - missing STRIPE_SECRET_KEY",
      }),
    );
  }

  if (!cachedStripe) {
    cachedStripe = new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-12-15.clover",
    });
  }

  return Effect.succeed(cachedStripe);
};

const createCheckoutSession = Effect.fn("StripeService.createCheckoutSession")(function* (
  params: CheckoutSessionParams,
) {
  const stripe = yield* getStripeClient();

  // For gift purchases: purchaser gets Stripe receipt, recipient gets HD link
  const isGift = params.type === "gift";
  const customerEmail = isGift && params.purchaserEmail ? params.purchaserEmail : params.email;

  // Use price_data with server-validated tier price (dev & production fallback)
  // In production with STRIPE_PRICE_ID configured and basic tier, use that price ID
  const useStripePriceId = env.STRIPE_PRICE_ID && params.tier === "basic";
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = useStripePriceId
    ? [{ price: env.STRIPE_PRICE_ID, quantity: 1 }]
    : [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: isGift
                ? `BabyPeek HD Photo Gift (${params.tier})`
                : `BabyPeek HD Photo (${params.tier})`,
            },
            unit_amount: params.priceCents,
          },
          quantity: 1,
        },
      ];

  return yield* Effect.tryPromise({
    try: () =>
      stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: customerEmail,
        // Allow customers to enter promo/discount codes
        allow_promotion_codes: true,
        metadata: {
          uploadId: params.uploadId,
          email: params.email, // Recipient email (for HD download link)
          type: params.type,
          tier: params.tier, // Pricing tier
          purchaserEmail: params.purchaserEmail || "", // Gift purchaser email
        },
      }),
    catch: (e) =>
      new PaymentError({
        cause: "STRIPE_ERROR",
        message: String(e),
      }),
  }).pipe(
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new PaymentError({ cause: "STRIPE_ERROR", message: "Stripe API timed out" })),
    ),
  );
});

const constructWebhookEvent = Effect.fn("StripeService.constructWebhookEvent")(function* (
  payload: string,
  signature: string,
) {
  const stripe = yield* getStripeClient();
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return yield* Effect.fail(
      new PaymentError({ cause: "WEBHOOK_INVALID", message: "Webhook secret not configured" }),
    );
  }
  return yield* Effect.try({
    try: () => stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET!),
    catch: () =>
      new PaymentError({
        cause: "WEBHOOK_INVALID",
        message: "Invalid webhook signature",
      }),
  });
});

const retrieveSession = Effect.fn("StripeService.retrieveSession")(function* (sessionId: string) {
  const stripe = yield* getStripeClient();
  return yield* Effect.tryPromise({
    try: () => stripe.checkout.sessions.retrieve(sessionId),
    catch: (e) =>
      new PaymentError({
        cause: "STRIPE_ERROR",
        message: String(e),
      }),
  }).pipe(
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new PaymentError({ cause: "STRIPE_ERROR", message: "Stripe API timed out" })),
    ),
  );
});

// Stripe Service implementation
export const StripeServiceLive = Layer.succeed(StripeService, {
  createCheckoutSession,
  constructWebhookEvent,
  retrieveSession,
});
