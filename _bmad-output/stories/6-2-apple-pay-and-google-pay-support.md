# Story 6.2: Apple Pay and Google Pay Support

Status: ready-for-dev

## Story

As a **user**,
I want **to pay with Apple Pay or Google Pay**,
so that **I can complete payment in two taps**.

## Acceptance Criteria

1. **AC-1:** Given I'm on Stripe Checkout, when Apple Pay is available on my device, then the express payment button is shown prominently
2. **AC-2:** Given I'm on Stripe Checkout, when Google Pay is available on my device, then the express payment button is shown prominently
3. **AC-3:** I can complete payment with biometric auth (Face ID, fingerprint)
4. **AC-4:** Payment completes without typing card details
5. **AC-5:** Express payment methods appear above card form in checkout

## Tasks / Subtasks

- [ ] **Task 1: Configure Stripe Checkout for express payments** (AC: 1, 2, 5)
  - [ ] Update StripeService.createCheckoutSession to enable Apple Pay
  - [ ] Verify payment_method_types includes 'card' (Stripe auto-adds Apple/Google Pay)
  - [ ] Ensure billing_address_collection is appropriate for express payments
  - [ ] Test Stripe Checkout renders express payment options

- [ ] **Task 2: Verify Apple Pay domain** (AC: 1)
  - [ ] Add Apple Pay domain verification file to `apps/web/public/.well-known/apple-developer-merchantid-domain-association`
  - [ ] Register domain in Stripe Dashboard → Apple Pay
  - [ ] Document verification steps in `docs/apple-pay-setup.md`

- [ ] **Task 3: Test express payment flows** (AC: 3, 4)
  - [ ] Test Apple Pay on iOS Safari with real device
  - [ ] Test Google Pay on Android Chrome
  - [ ] Verify biometric authentication works
  - [ ] Verify payment completes without card entry

- [ ] **Task 4: Add analytics for payment method** (AC: 1, 2)
  - [ ] Track `payment_method_type` in purchase_completed event
  - [ ] Distinguish between 'card', 'apple_pay', 'google_pay'
  - [ ] Add to PostHog for conversion analysis

- [ ] **Task 5: Write tests**
  - [ ] Unit test: Checkout session config enables express payments
  - [ ] Manual test: Apple Pay flow on iOS device
  - [ ] Manual test: Google Pay flow on Android device

## Dev Notes

### Architecture Compliance

- **No Frontend Code Needed:** Stripe Checkout handles all express payment UI
- **Configuration Only:** Express payments are enabled by default in Stripe Checkout
- **Domain Verification:** Apple Pay requires domain verification file

### How Stripe Checkout Handles Express Payments

Stripe Checkout automatically:
1. Detects device/browser capabilities
2. Shows Apple Pay on iOS Safari, macOS Safari
3. Shows Google Pay on Chrome with saved cards
4. Handles all biometric authentication
5. Falls back to card form if express payments unavailable

### Stripe Configuration (Already Correct)

The existing StripeService.createCheckoutSession uses:
```typescript
payment_method_types: ["card"]  // This enables Apple Pay + Google Pay automatically
mode: "payment"
```

Stripe Checkout with `payment_method_types: ["card"]` automatically enables:
- Apple Pay (on supported devices)
- Google Pay (on supported browsers)
- Link (Stripe's saved payment method)

### Apple Pay Domain Verification

```
# apps/web/public/.well-known/apple-developer-merchantid-domain-association
# Get this file from Stripe Dashboard → Settings → Payment methods → Apple Pay
```

Steps:
1. Go to Stripe Dashboard → Settings → Payment methods
2. Click "Configure" on Apple Pay
3. Add your domain (e.g., 3d-ultra.com)
4. Download the verification file
5. Place in `apps/web/public/.well-known/`

### Testing Express Payments

**Apple Pay Testing:**
- Requires real iOS device or macOS with Safari
- Stripe test mode works with Apple Pay
- Use Stripe test cards in Apple Wallet (Stripe provides test card)

**Google Pay Testing:**
- Works in Chrome with saved test cards
- Stripe test mode auto-enables Google Pay sandbox

### Analytics Enhancement

```typescript
// In webhook handler (Story 6.3), extract payment method
const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)
const paymentMethodType = paymentIntent.payment_method_types[0] // 'card', 'apple_pay', 'google_pay'

// Track in PostHog
posthog.capture('purchase_completed', {
  upload_id: metadata.uploadId,
  amount: session.amount_total,
  payment_method: paymentMethodType,
})
```

### File Structure

```
apps/web/public/.well-known/
├── apple-developer-merchantid-domain-association  <- NEW: Apple Pay verification

docs/
├── apple-pay-setup.md                              <- NEW: Setup documentation
```

### Dependencies

- **Story 6.1 (Stripe Checkout):** Must be complete - provides checkout flow
- **Stripe Account:** Apple Pay must be enabled in Stripe Dashboard
- **Domain Verification:** Required for Apple Pay production

### What This Enables

- Higher conversion rates with 2-tap checkout
- Better mobile experience
- Trust signals (Apple Pay / Google Pay logos)

### References

- [Source: _bmad-output/epics.md#Story 6.2] - Acceptance criteria
- [Source: _bmad-output/prd.md#FR-4.2, FR-4.3] - Apple Pay, Google Pay requirements
- [Stripe Docs: Apple Pay](https://stripe.com/docs/apple-pay)
- [Stripe Docs: Google Pay](https://stripe.com/docs/google-pay)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
