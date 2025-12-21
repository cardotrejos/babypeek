# Story 6.4: Purchase Record Creation

Status: ready-for-dev

## Story

As a **system**,
I want **purchase records stored in the database**,
so that **I can verify access and track revenue**.

## Acceptance Criteria

1. **AC-1:** Given a successful payment, when the purchase is recorded, then the record includes uploadId, stripeSessionId, stripePaymentIntentId, amount, currency
2. **AC-2:** Type is "self" for regular purchases (isGift: false)
3. **AC-3:** Type is "gift" for gift purchases (isGift: true)
4. **AC-4:** purchase_completed event is sent to PostHog with uploadId, amount, currency, isGift
5. **AC-5:** Purchase status is set to "completed" on successful creation
6. **AC-6:** Upload record is marked as purchased (for access verification)

## Tasks / Subtasks

- [ ] **Task 1: Implement PurchaseService.createFromWebhook** (AC: 1, 2, 3, 5)
  - [ ] Add createFromWebhook method to `packages/api/src/services/PurchaseService.ts`
  - [ ] Accept: uploadId, stripeSessionId, stripePaymentIntentId, amount, currency, isGift
  - [ ] Insert into purchases table with status "completed"
  - [ ] Return created purchase record

- [ ] **Task 2: Add purchase verification method** (AC: 6)
  - [ ] Add hasPurchased method to PurchaseService
  - [ ] Check if completed purchase exists for uploadId
  - [ ] Used by download endpoint to verify access

- [ ] **Task 3: Add PostHog tracking** (AC: 4)
  - [ ] Create analytics event in webhook handler after purchase created
  - [ ] Track `purchase_completed` with properties:
    - upload_id
    - amount (in cents)
    - currency
    - is_gift
    - payment_method (from payment intent)
  - [ ] Use server-side PostHog client

- [ ] **Task 4: Handle gift purchase metadata** (AC: 3)
  - [ ] Store giftRecipientEmail if type is "gift"
  - [ ] Gift email comes from upload record's email
  - [ ] Purchaser email is in Stripe session

- [ ] **Task 5: Write tests**
  - [ ] Unit test: createFromWebhook creates purchase record
  - [ ] Unit test: hasPurchased returns true for completed purchases
  - [ ] Unit test: hasPurchased returns false for no purchase
  - [ ] Unit test: PostHog event includes correct properties
  - [ ] Integration test: Webhook creates purchase and triggers analytics

## Dev Notes

### Architecture Compliance

- **Service Pattern:** PurchaseService using Effect with typed errors
- **Database:** Uses existing purchases table in `packages/db/src/schema/index.ts`
- **Analytics:** Server-side PostHog for reliable tracking

### Database Schema (Already Exists)

```typescript
// packages/db/src/schema/index.ts
export const purchases = pgTable("purchases", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  uploadId: text("upload_id").notNull().references(() => uploads.id),
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: integer("amount").notNull(), // cents
  currency: text("currency").default("usd").notNull(),
  status: text("status", { enum: purchaseStatusValues }).default("pending").notNull(),
  isGift: boolean("is_gift").default(false).notNull(),
  giftRecipientEmail: text("gift_recipient_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
```

### PurchaseService Implementation

```typescript
// packages/api/src/services/PurchaseService.ts
import { Effect, Context, Layer } from "effect"
import { createId } from "@paralleldrive/cuid2"
import { db, purchases, uploads } from "@3d-ultra/db"
import { eq } from "drizzle-orm"
import { PaymentError } from "../lib/errors"

export interface CreatePurchaseParams {
  uploadId: string
  stripeSessionId: string
  stripePaymentIntentId: string
  amount: number
  currency: string
  isGift: boolean
  giftRecipientEmail?: string
}

export class PurchaseService extends Context.Tag("PurchaseService")<
  PurchaseService,
  {
    createFromWebhook: (params: CreatePurchaseParams) => Effect.Effect<Purchase, PaymentError>
    hasPurchased: (uploadId: string) => Effect.Effect<boolean, never>
    getByUploadId: (uploadId: string) => Effect.Effect<Purchase | null, never>
  }
>() {}

const createFromWebhook = Effect.fn("PurchaseService.createFromWebhook")(function* (
  params: CreatePurchaseParams
) {
  const [purchase] = yield* Effect.tryPromise({
    try: () =>
      db.insert(purchases).values({
        id: createId(),
        uploadId: params.uploadId,
        stripeSessionId: params.stripeSessionId,
        stripePaymentIntentId: params.stripePaymentIntentId,
        amount: params.amount,
        currency: params.currency,
        status: "completed",
        isGift: params.isGift,
        giftRecipientEmail: params.giftRecipientEmail,
      }).returning(),
    catch: (e) =>
      new PaymentError({
        cause: "STRIPE_ERROR",
        message: `Failed to create purchase: ${String(e)}`,
      }),
  })
  
  return purchase
})

const hasPurchased = Effect.fn("PurchaseService.hasPurchased")(function* (uploadId: string) {
  const purchase = yield* Effect.promise(() =>
    db.query.purchases.findFirst({
      where: eq(purchases.uploadId, uploadId),
    })
  )
  return purchase?.status === "completed"
})

export const PurchaseServiceLive = Layer.succeed(PurchaseService, {
  createFromWebhook,
  hasPurchased,
  getByUploadId: Effect.fn("PurchaseService.getByUploadId")(function* (uploadId: string) {
    return yield* Effect.promise(() =>
      db.query.purchases.findFirst({
        where: eq(purchases.uploadId, uploadId),
      })
    ) as Effect.Effect<Purchase | null, never>
  }),
})
```

### PostHog Server-Side Tracking

```typescript
// In webhook handler after purchase created
import { PostHog } from "posthog-node"

const posthog = new PostHog(env.POSTHOG_KEY, { host: "https://app.posthog.com" })

// Track purchase
posthog.capture({
  distinctId: params.uploadId, // Use uploadId as user identifier
  event: "purchase_completed",
  properties: {
    upload_id: params.uploadId,
    amount: params.amount,
    currency: params.currency,
    is_gift: params.isGift,
    stripe_session_id: params.stripeSessionId,
  },
})

// Flush before function ends
await posthog.shutdown()
```

### Integration with Webhook (Story 6.3)

```typescript
// In webhook handler
const handleCheckoutCompleted = (session: Stripe.Checkout.Session) =>
  Effect.gen(function* () {
    const { uploadId, email, type } = session.metadata!
    
    // Create purchase record
    const purchase = yield* PurchaseService.createFromWebhook({
      uploadId,
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
      amount: session.amount_total!,
      currency: session.currency!,
      isGift: type === "gift",
      giftRecipientEmail: type === "gift" ? email : undefined,
    })
    
    // Track analytics (PostHog)
    yield* Effect.promise(() => trackPurchaseCompleted(purchase))
    
    return purchase
  })
```

### File Structure

```
packages/api/src/services/
├── PurchaseService.ts       <- NEW: Full implementation
├── PurchaseService.test.ts  <- NEW: Tests
```

### Dependencies

- **Story 6.3 (Webhook):** Calls createFromWebhook
- **Database:** ✅ purchases table exists
- **PostHog:** Server-side SDK for analytics

### What This Enables

- Story 6.5: Receipt email (needs purchase record)
- Story 7.1: HD download access verification
- Revenue tracking and analytics

### References

- [Source: _bmad-output/epics.md#Story 6.4] - Acceptance criteria
- [Source: packages/db/src/schema/index.ts#purchases] - Database schema
- [Source: _bmad-output/architecture.md#Effect Service Pattern] - Service pattern

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
