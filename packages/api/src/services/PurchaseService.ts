import { Effect, Context, Layer } from "effect";
import { eq, and } from "drizzle-orm";
import { db, uploads, purchases, type Purchase } from "@babypeek/db";
import { StripeService } from "./StripeService";
import { NotFoundError, PaymentError, ValidationError } from "../lib/errors";
import { env } from "../lib/env";

// Purchase creation params from webhook
export interface CreatePurchaseParams {
  uploadId: string;
  stripeSessionId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  isGift: boolean;
  giftRecipientEmail?: string;
}

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
      type: "self" | "gift",
    ) => Effect.Effect<
      { checkoutUrl: string; sessionId: string },
      NotFoundError | PaymentError | ValidationError
    >;

    /**
     * Create a Stripe checkout session for a gift purchase.
     * PUBLIC - anyone can gift purchase (no auth required).
     * Story 6.7: Gift Purchase Option (AC-1, AC-2)
     *
     * @param uploadId - The upload ID to gift
     * @param purchaserEmail - The gift purchaser's email for receipt
     * @returns Checkout session URL for redirect
     */
    createGiftCheckout: (
      uploadId: string,
      purchaserEmail: string,
    ) => Effect.Effect<
      { checkoutUrl: string; sessionId: string },
      NotFoundError | PaymentError | ValidationError
    >;

    /**
     * Create purchase record from webhook data.
     * Called by webhook handler after successful checkout.
     * Status is set to "completed" immediately.
     *
     * @param params - Purchase parameters from webhook
     * @returns Created purchase record
     */
    createFromWebhook: (params: CreatePurchaseParams) => Effect.Effect<Purchase, PaymentError>;

    /**
     * Check if a completed purchase exists for an upload.
     * Used by download endpoint to verify access.
     *
     * @param uploadId - The upload ID to check
     * @returns True if completed purchase exists
     */
    hasPurchased: (uploadId: string) => Effect.Effect<boolean, never>;

    /**
     * Get purchase record by upload ID.
     *
     * @param uploadId - The upload ID
     * @returns Purchase record or null
     */
    getByUploadId: (uploadId: string) => Effect.Effect<Purchase | null, never>;
  }
>() {}

/**
 * Create checkout session using injected StripeService instance.
 * Pattern matches ResultService for consistent dependency injection.
 */
const createCheckout = (stripeService: StripeService["Type"]) =>
  Effect.fn("PurchaseService.createCheckout")(function* (uploadId: string, type: "self" | "gift") {
    // Get upload record
    const upload = yield* Effect.promise(async () => {
      return db.query.uploads.findFirst({
        where: eq(uploads.id, uploadId),
      });
    });

    if (!upload) {
      return yield* Effect.fail(new NotFoundError({ resource: "upload", id: uploadId }));
    }

    // Validate upload is completed with result
    if (upload.status !== "completed" || !upload.resultUrl) {
      return yield* Effect.fail(
        new ValidationError({
          field: "uploadId",
          message: "Upload must be completed with a result before purchase",
        }),
      );
    }

    // Check for existing pending purchase to prevent duplicates
    const existingPurchase = yield* Effect.promise(async () => {
      return db.query.purchases.findFirst({
        where: and(eq(purchases.uploadId, uploadId), eq(purchases.status, "pending")),
      });
    });

    if (existingPurchase) {
      return yield* Effect.fail(
        new ValidationError({
          field: "uploadId",
          message: "A pending purchase already exists for this upload",
        }),
      );
    }

    // Build success/cancel URLs
    const successUrl = `${env.APP_URL}/checkout-success?session_id={CHECKOUT_SESSION_ID}`;
    // Story 6.6: Include cancelled=true for graceful failure handling
    // Use /preview/ (public, no session required) so cancel works on any device
    const cancelUrl = `${env.APP_URL}/preview/${uploadId}?cancelled=true`;

    // Create Stripe checkout session
    const session = yield* stripeService.createCheckoutSession({
      uploadId,
      email: upload.email,
      type,
      successUrl,
      cancelUrl,
    });

    // Create pending purchase record
    yield* Effect.promise(async () => {
      return db.insert(purchases).values({
        uploadId,
        stripeSessionId: session.id,
        amount: env.PRODUCT_PRICE_CENTS,
        currency: "usd",
        status: "pending",
        isGift: type === "gift",
      });
    });

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  });

/**
 * Create gift checkout session (Story 6.7).
 * PUBLIC endpoint - anyone can purchase a gift without authentication.
 */
const createGiftCheckout = (stripeService: StripeService["Type"]) =>
  Effect.fn("PurchaseService.createGiftCheckout")(function* (
    uploadId: string,
    purchaserEmail: string,
  ) {
    // Get upload record (we need recipient email)
    const upload = yield* Effect.promise(async () => {
      return db.query.uploads.findFirst({
        where: eq(uploads.id, uploadId),
      });
    });

    if (!upload) {
      return yield* Effect.fail(new NotFoundError({ resource: "upload", id: uploadId }));
    }

    // Validate upload is completed with result
    if (upload.status !== "completed" || !upload.resultUrl) {
      return yield* Effect.fail(
        new ValidationError({
          field: "uploadId",
          message: "Upload must be completed with a result before purchase",
        }),
      );
    }

    // H2 Fix: Check for existing pending gift purchase to prevent duplicates
    const existingPurchase = yield* Effect.promise(async () => {
      return db.query.purchases.findFirst({
        where: and(eq(purchases.uploadId, uploadId), eq(purchases.status, "pending")),
      });
    });

    if (existingPurchase) {
      return yield* Effect.fail(
        new ValidationError({
          field: "uploadId",
          message: "A pending purchase already exists for this upload",
        }),
      );
    }

    // Build success/cancel URLs for gift flow
    // Gift success redirects to a thank-you page, cancel goes back to share page
    const successUrl = `${env.APP_URL}/checkout-success?session_id={CHECKOUT_SESSION_ID}&gift=true`;
    const cancelUrl = `${env.APP_URL}/share/${uploadId}?cancelled=true`;

    // Create Stripe checkout session with gift metadata
    const session = yield* stripeService.createCheckoutSession({
      uploadId,
      email: upload.email, // Recipient email (original uploader)
      type: "gift",
      successUrl,
      cancelUrl,
      purchaserEmail, // Purchaser email (for receipt)
    });

    // Create pending purchase record marked as gift
    yield* Effect.promise(async () => {
      return db.insert(purchases).values({
        uploadId,
        stripeSessionId: session.id,
        amount: env.PRODUCT_PRICE_CENTS,
        currency: "usd",
        status: "pending",
        isGift: true,
        giftRecipientEmail: upload.email, // Store recipient email
      });
    });

    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  });

/**
 * Create purchase record from webhook data (Story 6.4).
 * Called after successful checkout.session.completed event.
 */
const createFromWebhook = (params: CreatePurchaseParams): Effect.Effect<Purchase, PaymentError> =>
  Effect.gen(function* () {
    // Check if purchase already exists (idempotency)
    const existing = yield* Effect.promise(() =>
      db.query.purchases.findFirst({
        where: eq(purchases.stripeSessionId, params.stripeSessionId),
      }),
    );

    // If already completed, return existing (idempotent)
    if (existing?.status === "completed") {
      return existing;
    }

    // If pending purchase exists, update it to completed
    if (existing) {
      const result = yield* Effect.tryPromise({
        try: () =>
          db
            .update(purchases)
            .set({
              status: "completed",
              stripePaymentIntentId: params.stripePaymentIntentId,
              giftRecipientEmail: params.giftRecipientEmail,
            })
            .where(eq(purchases.stripeSessionId, params.stripeSessionId))
            .returning(),
        catch: (e) =>
          new PaymentError({
            cause: "STRIPE_ERROR",
            message: `Failed to update purchase: ${String(e)}`,
          }),
      });

      if (!result[0]) {
        return yield* Effect.fail(
          new PaymentError({
            cause: "STRIPE_ERROR",
            message: "Failed to update purchase - no record returned",
          }),
        );
      }
      return result[0];
    }

    // No existing purchase - create new completed record
    const result = yield* Effect.tryPromise({
      try: () =>
        db
          .insert(purchases)
          .values({
            uploadId: params.uploadId,
            stripeSessionId: params.stripeSessionId,
            stripePaymentIntentId: params.stripePaymentIntentId,
            amount: params.amount,
            currency: params.currency,
            status: "completed",
            isGift: params.isGift,
            giftRecipientEmail: params.giftRecipientEmail,
          })
          .returning(),
      catch: (e) =>
        new PaymentError({
          cause: "STRIPE_ERROR",
          message: `Failed to create purchase: ${String(e)}`,
        }),
    });

    if (!result[0]) {
      return yield* Effect.fail(
        new PaymentError({
          cause: "STRIPE_ERROR",
          message: "Failed to create purchase - no record returned",
        }),
      );
    }
    return result[0];
  }).pipe(Effect.withSpan("PurchaseService.createFromWebhook"));

/**
 * Check if a completed purchase exists for an upload (Story 6.4 AC-6).
 * Used by download endpoint to verify access.
 */
const hasPurchased = (uploadId: string): Effect.Effect<boolean, never> =>
  Effect.gen(function* () {
    const purchase = yield* Effect.promise(() =>
      db.query.purchases.findFirst({
        where: and(eq(purchases.uploadId, uploadId), eq(purchases.status, "completed")),
      }),
    );
    return purchase !== undefined;
  }).pipe(Effect.withSpan("PurchaseService.hasPurchased"));

/**
 * Get purchase record by upload ID.
 */
const getByUploadId = (uploadId: string): Effect.Effect<Purchase | null, never> =>
  Effect.gen(function* () {
    const purchase = yield* Effect.promise(() =>
      db.query.purchases.findFirst({
        where: eq(purchases.uploadId, uploadId),
      }),
    );
    return purchase ?? null;
  }).pipe(Effect.withSpan("PurchaseService.getByUploadId"));

// PurchaseService Live implementation - uses StripeService dependency
export const PurchaseServiceLive = Layer.effect(
  PurchaseService,
  Effect.gen(function* () {
    const stripeService = yield* StripeService;

    return {
      createCheckout: createCheckout(stripeService),
      createGiftCheckout: createGiftCheckout(stripeService),
      createFromWebhook,
      hasPurchased,
      getByUploadId,
    };
  }),
);
