# Apple Pay Setup Guide

This guide covers enabling Apple Pay for 3D Ultra payments.

## Overview

Apple Pay is automatically enabled through Stripe Checkout when:
1. `payment_method_types: ["card"]` is configured (already done)
2. Domain verification is completed for production

## Current Configuration

The StripeService at `packages/api/src/services/StripeService.ts` already has the correct configuration:

```typescript
stripe.checkout.sessions.create({
  payment_method_types: ["card"], // Enables Apple Pay + Google Pay + Link
  mode: "payment",
  // ...
})
```

## Test Mode

In Stripe test mode, Apple Pay works automatically:
- Use any real Apple device with Safari
- Stripe test cards can be added to Apple Wallet
- No domain verification required

## Production Setup

### Step 1: Access Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Switch to **production mode**
3. Navigate to: Settings → Payment methods

### Step 2: Configure Apple Pay

1. Find "Apple Pay" in the payment methods list
2. Click "Configure"
3. You'll see "Domains" section

### Step 3: Add Your Domain

1. Click "Add new domain"
2. Enter your production domain: `3d-ultra.com` (or your actual domain)
3. Stripe will provide a verification file

### Step 4: Download and Deploy Verification File

1. Download the `apple-developer-merchantid-domain-association` file
2. Place it in: `apps/web/public/.well-known/apple-developer-merchantid-domain-association`
3. **Important:** Remove any file extension (no `.txt`, no `.json`)
4. Deploy to production

### Step 5: Verify Domain

1. Return to Stripe Dashboard
2. Click "Verify" next to your domain
3. Stripe will check for the file at:
   ```
   https://your-domain.com/.well-known/apple-developer-merchantid-domain-association
   ```
4. Once verified, Apple Pay is active for that domain

## File Location

```
apps/web/public/
└── .well-known/
    └── apple-developer-merchantid-domain-association   <- No extension!
```

## Troubleshooting

### Apple Pay Not Showing

1. **Not on Apple device**: Apple Pay only shows on iOS Safari, macOS Safari
2. **Domain not verified**: Check Stripe Dashboard for verification status
3. **HTTPS required**: Apple Pay requires HTTPS (automatic on production)
4. **No cards in Wallet**: User must have cards added to Apple Wallet

### Verification Failed

1. Ensure file is at correct path
2. Ensure file has no extension
3. Ensure file content matches exactly (no extra whitespace)
4. Check that file is served with correct MIME type

## Google Pay

Google Pay requires no domain verification! It works automatically when:
- User is on Chrome
- User has saved payment methods in Google Pay
- `payment_method_types: ["card"]` is configured (already done)

## References

- [Stripe: Apple Pay Docs](https://stripe.com/docs/apple-pay)
- [Stripe: Google Pay Docs](https://stripe.com/docs/google-pay)
- [Apple: Apple Pay on the Web](https://developer.apple.com/apple-pay/)
