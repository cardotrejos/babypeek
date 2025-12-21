# Story 6.3: Stripe Webhook Handler

Status: ready-for-dev

## Story

As a **system**,
I want **payment completions processed via webhook**,
so that **purchases are recorded reliably**.

## Acceptance Criteria

1. **AC-1:** Given a Stripe checkout.session.completed event, when the webhook is received, then the signature is verified using STRIPE_WEBHOOK_SECRET
2. **AC-2:** Duplicate events are handled idempotently (check stripeSessionId exists in purchases table)
3. **AC-3:** The event is acknowledged with 200 status within timeout
4. **AC-4:** Webhook errors are logged to Sentry with context
5. **AC-5:** Invalid signatures return 400 status
6. **AC-6:** Missing/malformed payload returns 400 status

## Tasks / Subtasks

- [ ] **Task 1: Create webhook route** (AC: 1, 3, 5, 6)
  - [ ] Create `apps/server/src/routes/webhook.ts` with POST /api/webhook/stripe
  - [ ] Parse raw body for signature verification (do NOT use JSON middleware)
  - [ ] Use StripeService.constructWebhookEvent for signature validation
  - [ ] Return 200 immediately after valid signature, process async

- [ ] **Task 2: Implement idempotency check** (AC: 2)
  - [ ] Check if stripeSessionId already exists in purchases table
  - [ ] If exists, return 200 without reprocessing
  - [ ] Log duplicate event for monitoring

- [ ] **Task 3: Handle checkout.session.completed** (AC: 1, 3)
  - [ ] Extract metadata: uploadId, email, type from session
  - [ ] Get payment details: amount_total, currency, payment_intent
  - [ ] Trigger purchase record creation (Story 6.4)
  - [ ] Trigger download email (Story 6.5)

- [ ] **Task 4: Add error handling and logging** (AC: 4)
  - [ ] Catch and log all errors to Sentry
  - [ ] Include stripeSessionId in error context (no PII)
  - [ ] Return 500 on processing errors (Stripe will retry)
  - [ ] Return 400 on validation errors (no retry needed)

- [ ] **Task 5: Configure Vercel for raw body** (AC: 1)
  - [ ] Update `apps/server/vercel.json` if needed
  - [ ] Ensure webhook route receives raw body, not parsed JSON
  - [ ] Test signature verification works in production

- [ ] **Task 6: Write tests**
  - [ ] Unit test: Valid signature passes verification
  - [ ] Unit test: Invalid signature returns 400
  - [ ] Unit test: Duplicate sessionId is idempotent
  - [ ] Unit test: checkout.session.completed triggers purchase creation
  - [ ] Integration test: End-to-end webhook flow

## Dev Notes

### Architecture Compliance

- **API Pattern:** Hono route → StripeService.constructWebhookEvent → Business logic
- **Error Handling:** PaymentError with WEBHOOK_INVALID cause
- **Idempotency:** Check purchases.stripeSessionId before processing
- **Raw Body:** Critical for signature verification

### Existing Code to Leverage

**StripeService.constructWebhookEvent** already exists:
```typescript
constructWebhookEvent: (payload: string, signature: string) => Effect.Effect<Stripe.Event, PaymentError>
```

**Environment configuration:**
- STRIPE_WEBHOOK_SECRET - webhook signing secret

### Webhook Handler Pattern

```typescript
// apps/server/src/routes/webhook.ts
import { Hono } from "hono"
import { Effect, pipe } from "effect"
import { StripeService, StripeServiceLive } from "@3d-ultra/api/services/StripeService"

const app = new Hono()

// CRITICAL: Do not use JSON body parser for this route
app.post("/stripe", async (c) => {
  const signature = c.req.header("stripe-signature")
  if (!signature) {
    return c.json({ error: "Missing signature" }, 400)
  }

  // Get raw body as text
  const payload = await c.req.text()

  const program = pipe(
    // 1. Verify signature
    StripeService.constructWebhookEvent(payload, signature),
    
    // 2. Handle event based on type
    Effect.flatMap((event) => {
      if (event.type === "checkout.session.completed") {
        return handleCheckoutCompleted(event.data.object)
      }
      return Effect.succeed({ handled: false })
    }),
    
    Effect.provide(StripeServiceLive)
  )

  try {
    await Effect.runPromise(program)
    return c.json({ received: true }, 200)
  } catch (error) {
    if (error instanceof PaymentError && error.cause === "WEBHOOK_INVALID") {
      return c.json({ error: "Invalid signature" }, 400)
    }
    // Log to Sentry
    console.error("Webhook error:", error)
    return c.json({ error: "Internal error" }, 500)
  }
})
```

### Idempotency Implementation

```typescript
const handleCheckoutCompleted = (session: Stripe.Checkout.Session) =>
  Effect.gen(function* () {
    const { uploadId, email, type } = session.metadata!
    
    // Check for existing purchase (idempotency)
    const existing = yield* Effect.promise(() =>
      db.query.purchases.findFirst({
        where: eq(purchases.stripeSessionId, session.id)
      })
    )
    
    if (existing) {
      yield* Effect.log(`Duplicate webhook for session ${session.id}, skipping`)
      return { handled: true, duplicate: true }
    }
    
    // Create purchase record (Story 6.4)
    yield* PurchaseService.createFromWebhook({
      uploadId,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
      amount: session.amount_total!,
      currency: session.currency!,
      isGift: type === "gift",
    })
    
    // Send emails (Story 6.5)
    yield* ResendService.sendReceiptEmail(email, session.id, session.amount_total!)
    
    return { handled: true }
  })
```

### Raw Body Configuration

For Vercel, ensure the webhook route can access raw body:

```typescript
// The route should NOT parse JSON automatically
// Use c.req.text() to get raw payload
```

### File Structure

```
apps/server/src/routes/
├── webhook.ts               <- NEW: Webhook handler

packages/api/src/services/
├── PurchaseService.ts       <- UPDATE: Add createFromWebhook method
```

### Stripe Webhook Events to Handle

| Event | Action |
|-------|--------|
| checkout.session.completed | Create purchase, send emails |
| payment_intent.payment_failed | Log for monitoring (no action) |
| checkout.session.expired | Log for monitoring (no action) |

### Dependencies

- **Story 6.1 (Checkout):** ✅ Creates checkout sessions
- **Existing StripeService:** ✅ Has constructWebhookEvent
- **Story 6.4 (Purchase Record):** Will consume this webhook
- **Story 6.5 (Receipt Email):** Will consume this webhook

### What This Enables

- Story 6.4: Purchase record creation
- Story 6.5: Receipt emails
- Story 6.7: Gift purchase handling

### References

- [Source: _bmad-output/epics.md#Story 6.3] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Stripe Webhook Pattern] - Implementation pattern
- [Source: packages/api/src/services/StripeService.ts#constructWebhookEvent] - Existing method
- [Stripe Docs: Webhooks](https://stripe.com/docs/webhooks)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
