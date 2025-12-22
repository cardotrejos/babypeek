import { Hono } from "hono"
import { Effect, Layer } from "effect"
import Stripe from "stripe"
import { StripeService, StripeServiceLive } from "../services/StripeService"
import { PurchaseService, PurchaseServiceLive } from "../services/PurchaseService"
import { ResendService, ResendServiceLive } from "../services/ResendService"
import { PaymentError } from "../lib/errors"
import { captureException, addBreadcrumb } from "../middleware/sentry"
import { captureEvent } from "../services/PostHogService"

const app = new Hono()

/**
 * Handle checkout.session.completed event from Stripe.
 * Creates/updates purchase record, sends receipt email, and tracks analytics (Story 6.4, 6.5).
 */
const handleCheckoutCompleted = (session: Stripe.Checkout.Session) =>
  Effect.gen(function* () {
    const purchaseService = yield* PurchaseService
    const resendService = yield* ResendService

    // Extract metadata from session
    const { uploadId, email, type } = session.metadata || {}

    if (!uploadId) {
      yield* Effect.log(`Warning: Missing uploadId in session ${session.id} metadata`)
      return { handled: false, warning: "missing_upload_id" }
    }

    // Validate payment_intent exists (can be null for setup mode sessions)
    const paymentIntentId = typeof session.payment_intent === "string" 
      ? session.payment_intent 
      : null
    
    if (!paymentIntentId) {
      yield* Effect.log(`Warning: Missing payment_intent for session ${session.id}`)
      // Continue anyway - payment_intent can be null in some edge cases
    }

    // Determine if gift purchase
    const isGift = type === "gift"

    // Create purchase record via PurchaseService (AC-1, AC-2, AC-3, AC-5)
    // Note: email in metadata is the gift recipient email for gift purchases,
    // or the purchaser email for self purchases (set during checkout creation)
    const purchase = yield* purchaseService.createFromWebhook({
      uploadId,
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId || "",
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      isGift,
      giftRecipientEmail: isGift ? email : undefined,
    })

    // Story 6.5 & 6.7: Send emails after purchase created
    // Handle email errors gracefully - don't fail webhook on email errors
    const purchaserEmail = session.customer_email
    const recipientEmail = email // Original uploader's email from metadata
    const appUrl = process.env.APP_URL || "https://3d-ultra.com"
    
    yield* Effect.gen(function* () {
      if (isGift && recipientEmail && purchaserEmail) {
        // Story 6.7: Gift purchase - send two separate emails
        
        // AC-4: Send gift confirmation to purchaser (thank-you tone)
        yield* resendService.sendGiftConfirmationEmail({
          email: purchaserEmail,
          purchaseId: purchase.id,
          amount: session.amount_total || 0,
        })
        
        // AC-3: Send gift notification to recipient (celebratory, surprise tone)
        yield* resendService.sendGiftNotificationEmail({
          email: recipientEmail,
          uploadId,
          downloadUrl: `${appUrl}/download/${uploadId}`,
        })
        
        yield* Effect.log(`Gift emails sent for purchase ${purchase.id}: confirmation to purchaser, notification to recipient`)
        
        // Track gift emails sent
        captureEvent("gift_emails_sent", uploadId, {
          upload_id: uploadId,
          is_gift: true,
          email_provider: "resend",
          emails_sent: ["gift_confirmation", "gift_notification"],
        })
      } else if (purchaserEmail) {
        // Regular purchase - send receipt to customer
        yield* resendService.sendReceiptEmail({
          email: purchaserEmail,
          purchaseId: purchase.id,
          uploadId,
          amount: session.amount_total || 0,
          isGift: false,
        })
        
        yield* Effect.log(`Receipt email sent for purchase ${purchase.id}`)
        
        // Track email sent (AC-5)
        captureEvent("receipt_email_sent", uploadId, {
          upload_id: uploadId,
          is_gift: false,
          email_provider: "resend",
          recipient_type: "purchaser",
        })
      }
    }).pipe(
      // Graceful error handling - log but don't fail webhook
      Effect.catchAll((emailError) =>
        Effect.gen(function* () {
          yield* Effect.log(`Warning: Failed to send email for ${purchase.id}: ${String(emailError)}`)
          captureEvent("email_send_failed", uploadId, {
            upload_id: uploadId,
            is_gift: isGift,
            error: String(emailError),
          })
        })
      )
    )

    // Track purchase_completed event in PostHog (AC-4)
    // Using try/catch to ensure analytics failures don't break the webhook
    try {
      captureEvent("purchase_completed", uploadId, {
        upload_id: uploadId,
        amount: purchase.amount,
        currency: purchase.currency,
        is_gift: purchase.isGift,
        stripe_session_id: session.id,
        payment_method: session.payment_method_types?.[0] || "card",
      })
      
      // Story 6.7: Track gift_purchase_completed for separate gift funnel (AC-6)
      if (isGift) {
        captureEvent("gift_purchase_completed", uploadId, {
          upload_id: uploadId,
          amount: purchase.amount,
          currency: purchase.currency,
          stripe_session_id: session.id,
        })
      }
    } catch (analyticsError) {
      // Log but don't fail - analytics is non-critical
      console.error("PostHog analytics error:", analyticsError)
    }

    yield* Effect.log(`Checkout completed for session ${session.id}, purchase ${purchase.id}`)
    return { handled: true, purchaseId: purchase.id }
  })

/**
 * POST /api/webhook/stripe
 *
 * Stripe webhook endpoint for payment events.
 * CRITICAL: Uses raw body for signature verification.
 *
 * AC-1: Signature verified using STRIPE_WEBHOOK_SECRET
 * AC-3: Returns 200 immediately within timeout
 * AC-4: Errors logged to Sentry with context
 * AC-5: Invalid signatures return 400
 * AC-6: Missing/malformed payload returns 400
 */
app.post("/stripe", async (c) => {
  // AC-5: Check for signature header
  const signature = c.req.header("stripe-signature")
  if (!signature) {
    return c.json({ error: "Missing signature" }, 400)
  }

  // AC-6: Get raw body as text (not JSON parsed)
  const payload = await c.req.text()
  if (!payload) {
    return c.json({ error: "Missing payload" }, 400)
  }

  // Try to extract session ID from payload for error context (no PII)
  let stripeSessionId: string | undefined
  try {
    const parsed = JSON.parse(payload)
    stripeSessionId = parsed?.data?.object?.id
  } catch {
    // Payload parsing failed - will be caught by signature verification
  }

  // Add breadcrumb for tracking
  addBreadcrumb("Webhook received", "webhook", {
    type: "stripe",
    hasSignature: true,
    hasPayload: true,
  })

  // Build Effect program for signature verification and event handling
  const program = Effect.gen(function* () {
    const stripeService = yield* StripeService

    // AC-1: Verify signature using StripeService
    const event = yield* stripeService.constructWebhookEvent(payload, signature)

    // Handle event based on type
    if (event.type === "checkout.session.completed") {
      return yield* handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
    }

    // Acknowledge other events without processing
    return { handled: false }
  }).pipe(
    Effect.provide(ResendServiceLive),
    Effect.provide(PurchaseServiceLive.pipe(Layer.provide(StripeServiceLive))),
    Effect.provide(StripeServiceLive)
  )

  const result = await Effect.runPromise(Effect.either(program))

  if (result._tag === "Left") {
    const error = result.left

    // AC-5: Invalid signature returns 400 (no retry)
    if (error instanceof PaymentError && error.cause === "WEBHOOK_INVALID") {
      // Log validation errors at lower severity - not actionable
      addBreadcrumb("Webhook signature invalid", "webhook", {
        stripeSessionId,
      })
      return c.json({ error: "Invalid signature" }, 400)
    }

    // AC-4: Log processing errors to Sentry with context (no PII)
    captureException(error instanceof Error ? error : new Error(String(error)), {
      stripeSessionId,
      webhookType: "stripe",
      errorType: error instanceof PaymentError ? error.cause : "UNKNOWN",
    })

    // Return 500 on processing errors (Stripe will retry)
    console.error("Webhook processing error:", error)
    return c.json({ error: "Internal error" }, 500)
  }

  // M3 Fix: Add success breadcrumb for monitoring
  addBreadcrumb("Webhook processed successfully", "webhook", {
    type: "stripe",
    stripeSessionId,
    handled: result.right.handled,
  })

  // AC-3: Return 200 to acknowledge receipt
  return c.json({ received: true }, 200)
})

export default app
