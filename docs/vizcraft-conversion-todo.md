# VizCraft Conversion Fixes TODO

**Created:** 2026-02-08
**Status:** VizCraft project not found on filesystem — this document serves as the implementation checklist for when the project is available.

**Note:** The `arch-visual` project in your local development directory may be VizCraft. Verify with Ricardo.

---

## Pre-requisites

Before implementing, confirm:

- [ ] VizCraft project location and repo access
- [ ] Tech stack (framework, backend, hosting)
- [ ] Whether `arch-visual` is VizCraft
- [ ] PostHog project/API key for VizCraft
- [ ] Facebook Pixel ID for VizCraft
- [ ] Stripe account/product IDs for VizCraft pricing tiers

---

## Phase 1: Critical Code Fixes

> Reference: BabyPeek implementations in `apps/web/src/routes/index.tsx` and `apps/web/src/components/`

### 1.1 Mobile Upload Button

**Priority:** CRITICAL
**Problem:** 0.15% upload rate suggests mobile UX is broken

- [ ] Full-width CTA button (60px height, gradient background, 20px font)
- [ ] Mobile sticky bottom CTA (fixed position, 80px height, z-index 1000)
- [ ] iOS safe-area-inset-bottom support
- [ ] Scroll direction show/hide behavior
- [ ] Two-line CTA: "Start FREE Preview" + "See results before you pay"
- [ ] Min 44px x 44px tap target
- [ ] Hide sticky CTA when upload starts (CustomEvent pattern from BabyPeek)

**BabyPeek reference:** `MobileStickyCTA` component hides on `babypeek:upload_started` CustomEvent

### 1.2 One-Click Upload Flow

**Priority:** CRITICAL
**Problem:** Too many steps between button click and upload start

- [ ] Hidden file input with `accept="image/*"` and `capture="environment"`
- [ ] Button click triggers file input directly (no confirmation modal)
- [ ] Immediate upload on file selection
- [ ] File validation: image type check, 10MB max size
- [ ] Loading state on button during upload
- [ ] Error handling with user-friendly messages

**Target flow:** Click button → file picker → select → upload starts immediately

### 1.3 Trust Signals & Messaging

**Priority:** CRITICAL
**Problem:** Users don't know they can preview for free

- [ ] Above-the-fold trust banner with 3 items:
  - "Free preview before purchase" (checkmark icon)
  - "Secure upload" (lock icon)
  - "Pay only if you love it" (heart icon)
- [ ] Green background tint (#10b981 at 10% opacity)
- [ ] Responsive: horizontal on desktop, vertical stack on mobile
- [ ] Copy to be provided by Athena (marketing)

### 1.4 PostHog Integration Verification

**Priority:** CRITICAL

- [ ] PostHog SDK installed and initialized
- [ ] Events tracking:
  - `upload_button_clicked` (with `button_location`, `device_type`)
  - `upload_started` (with `file_type`, `file_size`, `source`)
  - `upload_completed` (with `processing_time_ms`)
  - `payment_page_viewed` (with `price_tier`)
  - `purchase` (with `value`, `currency`, `tier`)
- [ ] Session recording enabled
- [ ] Feature flags loading correctly
- [ ] User identification working

---

## Phase 2: A/B Testing & Revenue Optimization

> Reference: BabyPeek A/B testing in `apps/web/src/lib/experiments.ts` and `apps/web/src/components/`

### 2.1 Feature Flag Setup for A/B Tests

**Priority:** HIGH

- [ ] PostHog feature flags integration
- [ ] `sticky_cta_test` variants:
  - `control` — standard button
  - `sticky_free_preview` — sticky with free preview subtitle
  - `sticky_with_arrow` — sticky with bouncing arrow
  - `sticky_with_countdown` — sticky with urgency timer
- [ ] Variant tracking event: `ab_test_variant_shown`
- [ ] No flickering/layout shift on variant load

**BabyPeek reference:** Experiment infrastructure in `apps/web/src/lib/experiments.ts`

### 2.2 Pricing Tiers UI

**Priority:** HIGH
**Goal:** Increase AOV from $9.99 to $14.99+

- [ ] Three-tier pricing cards:
  - **Basic** — $9.99 (1 HD image, basic enhancement, instant download)
  - **Plus** — $14.99, "MOST POPULAR" badge (3 HD images, advanced enhancement, multiple styles, priority processing)
  - **Pro** — $24.99 (10 HD images, premium enhancement, all styles + custom, commercial license, 24h support)
- [ ] Middle tier visually elevated (scale 1.05, gradient border, badge)
- [ ] Tier selection tracked in PostHog (`pricing_tier_selected`)
- [ ] Selection stored in sessionStorage for checkout
- [ ] Responsive grid (3-col desktop, 1-col mobile)

**BabyPeek reference:** Pricing implementation in checkout flow components

### 2.3 Facebook Pixel Integration

**Priority:** HIGH

- [ ] Facebook Pixel SDK installed (Pixel ID from Athena)
- [ ] Events:
  - `PageView` — on every page load
  - `InitiateCheckout` — on upload started
  - `AddPaymentInfo` — on upload completed
  - `Purchase` — on payment (with `value`, `currency`)
- [ ] No duplicate event firing
- [ ] Verify in Facebook Events Manager

**BabyPeek reference:** Facebook Pixel setup in `apps/web/src/routes/__root.tsx`

---

## Phase 3: Performance Optimization

### 3.1 Image Upload Performance

**Priority:** MEDIUM

- [ ] Client-side image compression before upload:
  - Max dimensions: 1920x1920
  - JPEG quality: 0.85
  - Target 50%+ file size reduction
- [ ] Upload progress bar with percentage
- [ ] Works on slow 3G connections
- [ ] No visible quality loss

**BabyPeek reference:** Upload handling in `apps/web/src/routes/index.tsx`

### 3.2 Error Handling & Monitoring

**Priority:** MEDIUM

- [ ] Global `window.error` handler → PostHog `javascript_error` event
- [ ] Unhandled promise rejection handler → PostHog `unhandled_promise_rejection` event
- [ ] Sentry integration for error tracking

**BabyPeek reference:** Sentry setup in `apps/web/src/main.tsx`

### 3.3 Performance Monitoring

**Priority:** MEDIUM

- [ ] Track page load performance via `performance.timing`:
  - `load_time_ms`
  - `dom_content_loaded`
  - `time_to_interactive`
- [ ] Send to PostHog as `page_performance` event

---

## Deployment Checklist

### Before Deploy
- [ ] All code tested on iPhone Safari (iOS 16+)
- [ ] All code tested on Android Chrome
- [ ] PostHog events verified in dashboard
- [ ] Facebook Pixel events verified in Events Manager
- [ ] No console errors
- [ ] Mobile viewport meta tag present
- [ ] Images optimized (WebP where supported)
- [ ] CSS/JS minified for production

### After Deploy
- [ ] Verify upload flow works end-to-end
- [ ] Check PostHog for event tracking
- [ ] Check Facebook Events Manager
- [ ] Monitor error logs (Sentry)
- [ ] Test on real devices (not just emulators)

---

## BabyPeek Implementation References

Use these BabyPeek files as templates when implementing VizCraft fixes:

| Feature | BabyPeek File |
|---|---|
| Landing page & upload UX | `apps/web/src/routes/index.tsx` |
| Root layout & analytics | `apps/web/src/routes/__root.tsx` |
| Processing flow | `apps/web/src/routes/processing.$jobId.tsx` |
| Result/paywall | `apps/web/src/routes/result.$resultId.tsx` |
| A/B experiments | `apps/web/src/lib/experiments.ts` |
| Watermark service | `packages/api/src/services/WatermarkService.ts` |
| Upload API | `packages/api/src/routes/upload.ts` |
| Status API | `packages/api/src/routes/status.ts` |
| Stripe checkout | `packages/api/src/routes/checkout.ts` |
