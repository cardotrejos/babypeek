import { Hono } from "hono";
import { Effect, Layer } from "effect";
import { z } from "zod";

import { PurchaseService, PurchaseServiceLive } from "../services/PurchaseService";
import { StripeServiceLive } from "../services/StripeService";
import { UploadService, UploadServiceLive } from "../services/UploadService";
import { NotFoundError, PaymentError, ValidationError } from "../lib/errors";
import { rateLimitMiddleware } from "../middleware/rate-limit";

// Composed layer: PurchaseService needs StripeService
const CheckoutRoutesLive = PurchaseServiceLive.pipe(Layer.provide(StripeServiceLive));

const app = new Hono();

// Apply rate limiting to prevent abuse
app.use("*", rateLimitMiddleware());

// Request schema
const checkoutSchema = z.object({
  uploadId: z.string().min(1, "Upload ID is required"),
  type: z.enum(["self", "gift"]).default("self"),
});

/**
 * POST /api/checkout
 *
 * Create a Stripe Checkout session for purchasing an HD image.
 * Requires session token for authentication.
 *
 * Headers:
 * - X-Session-Token: string - Session token for authorization
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
  // Require session token for authentication
  const sessionToken = c.req.header("X-Session-Token");
  if (!sessionToken) {
    return c.json({ error: "Session token required", code: "MISSING_TOKEN" }, 401);
  }

  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  const { uploadId, type } = parsed.data;

  // Verify session token matches upload before proceeding
  const verifyAndCheckout = Effect.fn("routes.checkout.verifyAndCreate")(function* () {
    const uploadService = yield* UploadService;

    // This throws NotFoundError if upload doesn't exist or token doesn't match
    yield* uploadService.getByIdWithAuth(uploadId, sessionToken);

    const purchaseService = yield* PurchaseService;
    return yield* purchaseService.createCheckout(uploadId, type);
  });

  const program = verifyAndCheckout().pipe(
    Effect.provide(CheckoutRoutesLive),
    Effect.provide(UploadServiceLive),
  );

  const result = await Effect.runPromise(Effect.either(program));

  if (result._tag === "Left") {
    const error = result.left;

    if (error instanceof NotFoundError) {
      return c.json({ error: "Upload not found", code: "NOT_FOUND" }, 404);
    }

    if (error instanceof ValidationError) {
      return c.json({ error: error.message, code: "VALIDATION_ERROR", field: error.field }, 400);
    }

    if (error instanceof PaymentError) {
      return c.json({ error: "Payment service unavailable", code: error.cause }, 503);
    }

    return c.json({ error: "Internal server error", code: "UNKNOWN" }, 500);
  }

  return c.json({
    checkoutUrl: result.right.checkoutUrl,
    sessionId: result.right.sessionId,
  });
});

// Gift checkout request schema
const giftCheckoutSchema = z.object({
  uploadId: z.string().min(1, "Upload ID is required"),
  purchaserEmail: z.string().email("Valid email is required"),
});

/**
 * POST /api/checkout/gift
 *
 * Create a Stripe Checkout session for gift purchase.
 * PUBLIC endpoint - no session token required (anyone can gift).
 *
 * Story 6.7: Gift Purchase Option (AC-1, AC-2)
 *
 * Request body:
 * - uploadId: string - The upload ID to gift
 * - purchaserEmail: string - Purchaser's email for receipt
 *
 * Response:
 * - checkoutUrl: string - Stripe Checkout URL for redirect
 * - sessionId: string - Stripe session ID
 */
app.post("/gift", async (c) => {
  // Parse and validate request body
  const body = await c.req.json().catch(() => ({}));
  const parsed = giftCheckoutSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  const { uploadId, purchaserEmail } = parsed.data;

  // Create gift checkout (no auth - anyone can gift)
  const createGiftCheckout = Effect.fn("routes.checkout.createGift")(function* () {
    const purchaseService = yield* PurchaseService;
    return yield* purchaseService.createGiftCheckout(uploadId, purchaserEmail);
  });

  const program = createGiftCheckout().pipe(Effect.provide(CheckoutRoutesLive));

  const result = await Effect.runPromise(Effect.either(program));

  if (result._tag === "Left") {
    const error = result.left;

    if (error instanceof NotFoundError) {
      return c.json({ error: "Upload not found", code: "NOT_FOUND" }, 404);
    }

    if (error instanceof ValidationError) {
      return c.json({ error: error.message, code: "VALIDATION_ERROR", field: error.field }, 400);
    }

    if (error instanceof PaymentError) {
      return c.json({ error: "Payment service unavailable", code: error.cause }, 503);
    }

    return c.json({ error: "Internal server error", code: "UNKNOWN" }, 500);
  }

  return c.json({
    checkoutUrl: result.right.checkoutUrl,
    sessionId: result.right.sessionId,
  });
});

export default app;
