# Story 6.1: Stripe Checkout Integration

Status: ready-for-dev

## Story

As a **user**,
I want **to purchase the HD version via Stripe**,
so that **I can get the full-resolution image**.

## Acceptance Criteria

1. **AC-1:** Given I'm viewing my result, when I tap "Get HD Version", then a Stripe Checkout session is created
2. **AC-2:** The session includes uploadId, email, and type ("self") in metadata
3. **AC-3:** I'm redirected to Stripe Checkout
4. **AC-4:** Price is displayed clearly ($9.99) using PRODUCT_PRICE_CENTS from env
5. **AC-5:** purchase_started event is sent to PostHog with uploadId and amount
6. **AC-6:** Cancel URL returns user to result page with their result still visible
7. **AC-7:** Success URL redirects to a success page that shows download options

## Tasks / Subtasks

- [ ] **Task 1: Create checkout API route** (AC: 1, 2)
  - [ ] Create `apps/server/src/routes/checkout.ts` with POST handler
  - [ ] Accept uploadId in request body
  - [ ] Validate uploadId exists and has a completed result
  - [ ] Use existing StripeService.createCheckoutSession
  - [ ] Return checkout session URL to frontend

- [ ] **Task 2: Create PurchaseService** (AC: 1, 2)
  - [ ] Create `packages/api/src/services/PurchaseService.ts`
  - [ ] Implement createCheckoutSession method that wraps StripeService
  - [ ] Add validation: upload must be completed with resultUrl
  - [ ] Add validation: no duplicate pending purchase for same upload
  - [ ] Export PurchaseServiceLive layer

- [ ] **Task 3: Create checkout button component** (AC: 3, 4)
  - [ ] Create `apps/web/src/components/payment/CheckoutButton.tsx`
  - [ ] Display price from API or env (PRODUCT_PRICE_CENTS / 100)
  - [ ] Call POST /api/checkout with uploadId
  - [ ] Redirect to Stripe Checkout URL on success
  - [ ] Show loading state during checkout creation

- [ ] **Task 4: Add checkout to RevealUI** (AC: 1, 3, 4)
  - [ ] Update `apps/web/src/components/reveal/RevealUI.tsx`
  - [ ] Replace placeholder onPurchase with actual checkout flow
  - [ ] Pass uploadId to CheckoutButton
  - [ ] Display formatted price ($9.99)

- [ ] **Task 5: Add success/cancel routes** (AC: 6, 7)
  - [ ] Create `apps/web/src/routes/checkout-success.tsx`
  - [ ] Show success message with download button
  - [ ] Create cancel handling (return to result page)
  - [ ] Preserve session token for result access

- [ ] **Task 6: Add PostHog analytics** (AC: 5)
  - [ ] Track `purchase_started` when checkout button clicked
  - [ ] Include uploadId, amount in event properties
  - [ ] Track `checkout_created` when session created successfully
  - [ ] Track `checkout_cancelled` when user returns via cancel URL

- [ ] **Task 7: Write tests**
  - [ ] Unit test: PurchaseService validates upload exists
  - [ ] Unit test: PurchaseService rejects if upload not completed
  - [ ] Unit test: CheckoutButton shows loading during creation
  - [ ] Integration test: Checkout flow creates Stripe session
  - [ ] E2E test: User can initiate checkout from result page

## Dev Notes

### Architecture Compliance

- **API Pattern:** Hono route → PurchaseService → StripeService (Effect Services)
- **Error Handling:** Use existing PaymentError from `packages/api/src/lib/errors.ts`
- **Components:** Located in `apps/web/src/components/payment/`
- **Route:** Checkout API at `apps/server/src/routes/checkout.ts`

### Existing Code to Leverage

**StripeService already exists** at `packages/api/src/services/StripeService.ts`:
```typescript
createCheckoutSession: (params: CheckoutSessionParams) => Effect.Effect<Stripe.Checkout.Session, PaymentError>

interface CheckoutSessionParams {
  uploadId: string
  email: string
  type: "self" | "gift"
  successUrl: string
  cancelUrl: string
}
```

**Environment configuration** at `packages/api/src/lib/env.ts`:
- PRODUCT_PRICE_CENTS - price in cents (999 for $9.99)
- STRIPE_SECRET_KEY - Stripe API key

**Database schema** at `packages/db/src/schema/index.ts`:
- purchases table already defined with uploadId, stripeSessionId, amount, status, isGift

### API Endpoint Design

```typescript
// POST /api/checkout
// Request: { uploadId: string }
// Response: { checkoutUrl: string }

// The endpoint:
// 1. Validates upload exists and is completed
// 2. Gets email from upload record
// 3. Creates Stripe Checkout session via StripeService
// 4. Returns checkout URL for frontend redirect
```

### PurchaseService Pattern

```typescript
// packages/api/src/services/PurchaseService.ts
import { Effect, Context, Layer } from "effect"
import { StripeService } from "./StripeService"
import { PaymentError } from "../lib/errors"
import { db, uploads, purchases } from "@3d-ultra/db"
import { eq } from "drizzle-orm"

export class PurchaseService extends Context.Tag("PurchaseService")<
  PurchaseService,
  {
    createCheckout: (uploadId: string, type: "self" | "gift") => Effect.Effect<string, PaymentError>
  }
>() {}

// Implementation validates upload, creates session, returns URL
```

### Frontend Integration

```typescript
// apps/web/src/components/payment/CheckoutButton.tsx
interface CheckoutButtonProps {
  uploadId: string
  disabled?: boolean
}

// Uses api.checkout.post({ uploadId }) then window.location.href = checkoutUrl
```

### URLs Configuration

```typescript
const successUrl = `${env.APP_URL}/checkout-success?session_id={CHECKOUT_SESSION_ID}`
const cancelUrl = `${env.APP_URL}/result/${uploadId}`
```

### File Structure

```
apps/server/src/routes/
├── checkout.ts              <- NEW: Checkout API endpoint

packages/api/src/services/
├── PurchaseService.ts       <- NEW: Purchase business logic
├── PurchaseService.test.ts  <- NEW: Tests

apps/web/src/components/payment/
├── CheckoutButton.tsx       <- NEW: Purchase button
├── CheckoutButton.test.tsx  <- NEW: Tests
├── index.ts                 <- NEW: Barrel export

apps/web/src/routes/
├── checkout-success.tsx     <- NEW: Success page
```

### Dependencies

- **Story 5.3 (Reveal):** ✅ RevealUI exists with onPurchase placeholder
- **Existing StripeService:** ✅ Already has createCheckoutSession
- **Database:** ✅ purchases table exists

### What This Enables

- Story 6.2: Apple/Google Pay (Stripe Checkout includes these)
- Story 6.3: Webhook handler (processes checkout.session.completed)
- Story 6.4: Purchase record creation (after webhook)

### References

- [Source: _bmad-output/epics.md#Story 6.1] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Stripe Webhook Pattern] - Integration pattern
- [Source: packages/api/src/services/StripeService.ts] - Existing service
- [Source: packages/db/src/schema/index.ts#purchases] - Database schema

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
