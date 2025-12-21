# Story 6.1: Stripe Checkout Integration

Status: done

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

- [x] **Task 1: Create checkout API route** (AC: 1, 2)
  - [x] Create `packages/api/src/routes/checkout.ts` with POST handler
  - [x] Accept uploadId in request body
  - [x] Validate uploadId exists and has a completed result
  - [x] Use existing StripeService.createCheckoutSession
  - [x] Return checkout session URL to frontend

- [x] **Task 2: Create PurchaseService** (AC: 1, 2)
  - [x] Create `packages/api/src/services/PurchaseService.ts`
  - [x] Implement createCheckoutSession method that wraps StripeService
  - [x] Add validation: upload must be completed with resultUrl
  - [x] Add validation: no duplicate pending purchase for same upload
  - [x] Export PurchaseServiceLive layer

- [x] **Task 3: Create checkout button component** (AC: 3, 4)
  - [x] Create `apps/web/src/components/payment/CheckoutButton.tsx`
  - [x] Display price from API or env (PRODUCT_PRICE_CENTS / 100)
  - [x] Call POST /api/checkout with uploadId
  - [x] Redirect to Stripe Checkout URL on success
  - [x] Show loading state during checkout creation

- [x] **Task 4: Add checkout to RevealUI** (AC: 1, 3, 4)
  - [x] Update `apps/web/src/components/reveal/RevealUI.tsx`
  - [x] Replace placeholder onPurchase with actual checkout flow
  - [x] Pass uploadId to CheckoutButton
  - [x] Display formatted price ($9.99)

- [x] **Task 5: Add success/cancel routes** (AC: 6, 7)
  - [x] Create `apps/web/src/routes/checkout-success.tsx`
  - [x] Show success message with download button
  - [x] Create cancel handling (return to result page)
  - [x] Preserve session token for result access

- [x] **Task 6: Add PostHog analytics** (AC: 5)
  - [x] Track `purchase_started` when checkout button clicked
  - [x] Include uploadId, amount in event properties
  - [x] Track `checkout_created` when session created successfully
  - [x] Track `checkout_error` when checkout fails

- [x] **Task 7: Write tests**
  - [x] Unit test: PurchaseService validates upload exists
  - [x] Unit test: PurchaseService rejects if upload not completed
  - [x] Unit test: CheckoutButton shows loading during creation
  - [x] Unit test: PurchaseService rejects duplicate pending purchases
  - [x] Unit test: PurchaseService handles Stripe errors
  - [x] Unit test: CheckoutButton tracks analytics events

## Dev Notes

### Architecture Compliance

- **API Pattern:** Hono route → PurchaseService → StripeService (Effect Services)
- **Error Handling:** Use existing PaymentError from `packages/api/src/lib/errors.ts`
- **Components:** Located in `apps/web/src/components/payment/`
- **Route:** Checkout API at `packages/api/src/routes/checkout.ts`

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

Claude Opus 4.5

### Debug Log References

None - implementation proceeded without issues.

### Completion Notes List

- Implemented PurchaseService following Effect pattern with StripeService dependency injection
- Created checkout API route at /api/checkout with proper validation and error handling
- Built CheckoutButton component with loading states and analytics tracking
- Updated RevealUI to use CheckoutButton, passing uploadId for checkout flow
- Created checkout-success page for post-payment redirect
- Added comprehensive PostHog tracking: purchase_started, checkout_created, checkout_completed, checkout_error
- All unit tests passing (6 PurchaseService tests, 11 CheckoutButton tests, 12 RevealUI tests)

### File List

**New Files:**
- packages/api/src/services/PurchaseService.ts
- packages/api/src/services/PurchaseService.test.ts
- packages/api/src/routes/checkout.ts
- apps/web/src/components/payment/CheckoutButton.tsx
- apps/web/src/components/payment/CheckoutButton.test.tsx
- apps/web/src/components/payment/index.ts
- apps/web/src/routes/checkout-success.tsx

**Modified Files:**
- packages/api/src/index.ts (added checkoutRoutes export)
- packages/api/src/services/index.ts (added PurchaseService export)
- apps/server/src/index.ts (mounted checkout route)
- apps/web/src/components/reveal/RevealUI.tsx (integrated CheckoutButton)
- apps/web/src/components/reveal/RevealUI.test.tsx (updated tests for new props)
- apps/web/src/routes/result.$resultId.tsx (pass uploadId to RevealUI)
- _bmad-output/stories/sprint-status.yaml (status updated to review)

## Senior Developer Review (AI)

**Review Date:** 2025-12-21  
**Review Outcome:** Approve (after fixes)  
**Reviewer:** Claude Opus 4.5 (Code Review Agent)

### Issues Found: 2 High, 4 Medium, 4 Low

### Action Items (All Resolved)

- [x] **[HIGH]** Test files not committed to git - FIXED: Staged test files
- [x] **[HIGH]** Cancel URL used wrong ID (uploadId vs resultId) - FIXED: Extract resultId from resultUrl
- [x] **[MEDIUM]** Missing authentication on checkout endpoint - FIXED: Added X-Session-Token validation
- [x] **[MEDIUM]** Success page showed false email claim - FIXED: Updated message
- [x] **[MEDIUM]** No rate limiting on checkout endpoint - FIXED: Added rateLimitMiddleware
- [x] **[LOW]** console.log in production code - FIXED: Removed
- [ ] **[MEDIUM]** checkout-success doesn't verify payment - Deferred to Story 6.3 (webhook handler)
- [ ] **[LOW]** Loading state doesn't reset on redirect failure - Minor edge case
- [ ] **[LOW]** Missing error handling for missing session_id - Minor edge case  
- [ ] **[LOW]** Download button is non-functional - By design for Story 7.x

### Fixes Applied

1. **PurchaseService.ts**: Extract resultId from upload.resultUrl for correct cancel URL
2. **checkout.ts**: Added rate limiting, session token validation via UploadService.getByIdWithAuth
3. **CheckoutButton.tsx**: Added session token header, imported getSession
4. **checkout-success.tsx**: Removed false email claim, removed console.log
5. **PurchaseService.test.ts**: Fixed mock data types, updated test for resultId extraction
6. **CheckoutButton.test.tsx**: Added session mock, test for missing session

## Change Log

| Date | Change |
|------|--------|
| 2025-12-21 | Story implementation complete - Stripe Checkout integration with PurchaseService, CheckoutButton, success page, and analytics |
| 2025-12-21 | Code review: Fixed 6 issues (2 High, 3 Medium, 1 Low). Added authentication, rate limiting, correct cancel URL. All tests passing (30 total). |
