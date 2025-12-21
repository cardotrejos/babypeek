# Story 6.6: Payment Failure Handling

Status: ready-for-dev

## Story

As a **user**,
I want **clear feedback if my payment fails**,
so that **I can resolve the issue and try again**.

## Acceptance Criteria

1. **AC-1:** Given I'm attempting payment, when the payment fails (declined, insufficient funds, etc.), then I see a warm error message
2. **AC-2:** The error message is user-friendly ("Payment didn't go through. Let's try again!")
3. **AC-3:** I can retry with the same or different payment method
4. **AC-4:** Card entry fallback is available if express pay fails
5. **AC-5:** The failure is logged to Sentry (without sensitive card data)
6. **AC-6:** payment_failed event is sent to PostHog with error_type

## Tasks / Subtasks

- [ ] **Task 1: Handle checkout cancellation** (AC: 1, 2, 3)
  - [ ] Update result page to detect `?cancelled=true` query param
  - [ ] Show warm toast message on cancellation
  - [ ] Keep "Get HD Version" button enabled for retry
  - [ ] Clear any loading states

- [ ] **Task 2: Handle Stripe Checkout errors** (AC: 1, 2, 4)
  - [ ] Stripe Checkout handles most errors internally
  - [ ] Configure error redirect URL: `${cancelUrl}?error=payment_failed`
  - [ ] Parse error query param on result page
  - [ ] Display appropriate error message

- [ ] **Task 3: Create error messages** (AC: 2)
  - [ ] Create `apps/web/src/lib/payment-errors.ts`
  - [ ] Map error types to user-friendly messages:
    - cancelled: "No worries! Your photo is still here when you're ready."
    - payment_failed: "Payment didn't go through. Let's try again!"
    - card_declined: "Your card was declined. Try a different payment method?"
    - generic: "Something went wrong. Let's try that again!"

- [ ] **Task 4: Add retry capability** (AC: 3, 4)
  - [ ] Ensure checkout button works after failed attempt
  - [ ] Clear previous error on new attempt
  - [ ] Track retry attempts in analytics

- [ ] **Task 5: Add Sentry logging** (AC: 5)
  - [ ] Log payment failures to Sentry
  - [ ] Include: upload_id, error_type, timestamp
  - [ ] Exclude: card numbers, CVV, full card details
  - [ ] Add breadcrumb for checkout flow

- [ ] **Task 6: Add PostHog tracking** (AC: 6)
  - [ ] Track `payment_failed` event on failure
  - [ ] Include: upload_id, error_type, retry_count
  - [ ] Track `payment_retry_attempted` on retry

- [ ] **Task 7: Write tests**
  - [ ] Unit test: Error messages render correctly
  - [ ] Unit test: Cancel query param shows toast
  - [ ] Unit test: Retry clears previous error
  - [ ] E2E test: User can retry after cancellation

## Dev Notes

### Architecture Compliance

- **Error Handling:** Warm, user-friendly messages (from UX spec)
- **Analytics:** PostHog for failure tracking
- **Monitoring:** Sentry for error logging (no PII)

### How Stripe Checkout Handles Failures

Stripe Checkout handles most payment failures internally:
1. Card declined → Shows error in Checkout, user can retry
2. 3D Secure failed → Returns to cancel URL
3. User closes tab → Nothing returned
4. User clicks back → Returns to cancel URL

Our job is to handle the redirect back gracefully.

### Cancel URL Configuration

```typescript
// In StripeService.createCheckoutSession
const cancelUrl = `${env.APP_URL}/result/${uploadId}?cancelled=true`

// For payment failures
const cancelUrl = `${env.APP_URL}/result/${uploadId}?error=payment_failed`
```

### Error Messages

```typescript
// apps/web/src/lib/payment-errors.ts
export const paymentErrorMessages = {
  cancelled: "No worries! Your photo is still here when you're ready.",
  payment_failed: "Payment didn't go through. Let's try again!",
  card_declined: "Your card was declined. Try a different payment method?",
  expired: "The checkout session expired. Let's start fresh!",
  generic: "Something went wrong. Let's try that again!",
} as const

export function getPaymentErrorMessage(error: string | null): string | null {
  if (!error) return null
  return paymentErrorMessages[error as keyof typeof paymentErrorMessages] 
    ?? paymentErrorMessages.generic
}
```

### Result Page Error Handling

```typescript
// apps/web/src/routes/result.$resultId.tsx
import { useSearchParams } from "@tanstack/react-router"
import { toast } from "sonner"
import { getPaymentErrorMessage } from "@/lib/payment-errors"

function ResultPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")
  const cancelled = searchParams.get("cancelled")
  
  // Show error toast on mount
  useEffect(() => {
    if (cancelled === "true") {
      toast.info("No worries! Your photo is still here when you're ready.")
      posthog.capture("checkout_cancelled", { upload_id: uploadId })
    } else if (error) {
      const message = getPaymentErrorMessage(error)
      toast.error(message)
      posthog.capture("payment_failed", { upload_id: uploadId, error_type: error })
      
      // Log to Sentry (no PII)
      Sentry.captureMessage("Payment failed", {
        level: "warning",
        extra: { upload_id: uploadId, error_type: error },
      })
    }
    
    // Clear query params
    window.history.replaceState({}, "", `/result/${uploadId}`)
  }, [error, cancelled, uploadId])
  
  // ... rest of component
}
```

### Retry Tracking

```typescript
// Track retry attempts
const [retryCount, setRetryCount] = useState(0)

const handlePurchase = () => {
  setRetryCount((prev) => prev + 1)
  posthog.capture("purchase_started", {
    upload_id: uploadId,
    retry_count: retryCount,
  })
  // ... initiate checkout
}
```

### Sentry Integration (No PII)

```typescript
// Safe to log
Sentry.captureMessage("Payment failed", {
  level: "warning",
  extra: {
    upload_id: uploadId,      // ✅ OK
    error_type: error,        // ✅ OK
    timestamp: new Date(),    // ✅ OK
  },
})

// NEVER log
// card_number, cvv, expiry, full_name, billing_address
```

### File Structure

```
apps/web/src/lib/
├── payment-errors.ts        <- NEW: Error message mapping

apps/web/src/routes/
├── result.$resultId.tsx     <- UPDATE: Error handling
```

### Dependencies

- **Story 6.1 (Checkout):** Provides checkout flow
- **Existing:** Sonner toast, Sentry, PostHog

### What This Enables

- Better user experience on payment failures
- Conversion recovery through easy retry
- Analytics on failure patterns

### References

- [Source: _bmad-output/epics.md#Story 6.6] - Acceptance criteria
- [Source: _bmad-output/prd.md#FR-4.7] - Handle failed payments gracefully
- [Source: _bmad-output/ux-design-specification.md] - Warm error copy guidelines
- [Source: _bmad-output/architecture.md#Error Handling] - Error handling strategy

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
