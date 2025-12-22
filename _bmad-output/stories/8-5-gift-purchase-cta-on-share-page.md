# Story 8.5: Gift Purchase CTA on Share Page

Status: ready-for-dev

## Story

As a **share recipient**,
I want **to buy the HD version as a gift**,
so that **I can surprise the expecting parent**.

## Acceptance Criteria

1. **AC-1:** Given I'm viewing a shared result (FR-6.6), when I see the gift CTA, then "Gift This Photo" button is prominently displayed
2. **AC-2:** Tapping it initiates the gift purchase flow (Epic 6, Story 6.7)
3. **AC-3:** The CTA explains "The HD photo will be sent to the parent"
4. **AC-4:** Button has clear visual hierarchy (primary action)
5. **AC-5:** Gift flow creates purchase with type="gift"

## Tasks / Subtasks

- [ ] **Task 1: Verify existing gift CTA** (AC: 1, 3, 4)
  - [ ] Review `apps/web/src/routes/share.$shareId.tsx` (already exists)
  - [ ] Verify "Gift This Photo" button is present
  - [ ] Verify explanation text is shown
  - [ ] Verify visual prominence

- [ ] **Task 2: Verify GiftCheckoutButton** (AC: 2, 5)
  - [ ] Review `apps/web/src/components/payment/GiftCheckoutButton.tsx`
  - [ ] Verify it creates checkout with type="gift"
  - [ ] Verify it passes correct uploadId

- [ ] **Task 3: Add analytics tracking**
  - [ ] Track `gift_cta_clicked` event
  - [ ] Track `gift_purchase_started` event
  - [ ] Include shareId in events

- [ ] **Task 4: Enhance UX** (AC: 1, 4)
  - [ ] Add gift emoji/icon to button
  - [ ] Ensure button stands out visually
  - [ ] Add subtle animation or highlight

- [ ] **Task 5: Write tests**
  - [ ] Unit test: GiftCheckoutButton renders
  - [ ] Unit test: Creates gift checkout session
  - [ ] Integration test: Gift purchase flow

## Dev Notes

### Architecture Compliance

- **Payment Pattern:** Stripe Checkout with metadata
- **Component Pattern:** Existing GiftCheckoutButton
- **Analytics:** PostHog event tracking

### Existing Code (Already Implemented!)

**Share page with Gift CTA** exists at `apps/web/src/routes/share.$shareId.tsx`:

```typescript
{/* Gift CTA Section */}
<div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
  <div className="text-center space-y-2">
    <h2 className="font-display text-lg text-charcoal">🎁 Gift the HD Version</h2>
    <p className="font-body text-sm text-warm-gray">
      Surprise the expecting parent with the full resolution portrait!
    </p>
  </div>

  <GiftCheckoutButton shareId={shareId} uploadId={result.uploadId} />

  {/* AC-5: Clear explanation */}
  <p className="text-center text-xs text-warm-gray/70">
    💌 The HD photo will be sent to the parent
  </p>
</div>
```

**GiftCheckoutButton** exists at `apps/web/src/components/payment/GiftCheckoutButton.tsx`

### What's Already Done

| Feature | Status | Location |
|---------|--------|----------|
| Gift CTA section | ✅ Complete | share.$shareId.tsx |
| GiftCheckoutButton | ✅ Complete | GiftCheckoutButton.tsx |
| Explanation text | ✅ Complete | share.$shareId.tsx |
| Visual styling | ✅ Complete | share.$shareId.tsx |

### What Needs to Be Done

| Feature | Status | Notes |
|---------|--------|-------|
| Analytics tracking | ❌ Pending | gift_cta_clicked event |
| Enhanced animation | ❌ Optional | Subtle attention-grabber |

### Analytics Enhancement

```typescript
// Add to GiftCheckoutButton.tsx
const handleGiftClick = useCallback(() => {
  if (isPostHogConfigured()) {
    posthog.capture("gift_cta_clicked", {
      share_id: shareId,
      upload_id: uploadId,
      source: "share_page",
    })
  }
  addBreadcrumb("Gift CTA clicked", "checkout", { share_id: shareId })
  
  // Existing checkout logic...
}, [shareId, uploadId])
```

### UX Enhancements (Optional)

Add subtle pulse animation to draw attention:

```typescript
<button
  onClick={handleGiftClick}
  className="w-full py-4 bg-coral text-white font-body text-lg rounded-xl 
             hover:bg-coral/90 transition-all min-h-[56px]
             animate-pulse-subtle"
>
  🎁 Gift This Photo - $9.99
</button>

// In tailwind.config.js
animation: {
  'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
},
keyframes: {
  'pulse-subtle': {
    '0%, 100%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.02)' },
  },
},
```

### Gift Purchase Flow

1. Visitor clicks "Gift This Photo" on share page
2. GiftCheckoutButton creates Stripe session with type="gift"
3. Visitor completes payment
4. Webhook processes payment, creates purchase with type="gift"
5. Original uploader receives HD download email
6. Gift buyer receives confirmation email

### File Structure

```
apps/web/src/routes/
├── share.$shareId.tsx          <- EXISTING: Has gift CTA

apps/web/src/components/payment/
├── GiftCheckoutButton.tsx      <- EXISTING: Gift checkout
├── GiftCheckoutButton.test.tsx <- EXISTING: Tests
```

### Dependencies

- **Story 6.7 (Gift Purchase):** Provides GiftCheckoutButton
- **Story 8.4 (Share Page):** Hosts the gift CTA

### Sequential After

Story 8.4 (Share Page)

### References

- [Source: _bmad-output/epics.md#Story 8.5] - Gift CTA requirements
- [Source: _bmad-output/prd.md#FR-6.6] - Gift purchase CTA requirement
- [Source: apps/web/src/routes/share.$shareId.tsx] - Existing implementation
- [Source: apps/web/src/components/payment/GiftCheckoutButton.tsx] - Existing button

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
