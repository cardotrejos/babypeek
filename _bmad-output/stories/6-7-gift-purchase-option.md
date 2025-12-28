# Story 6.7: Gift Purchase Option

Status: done

## Story

As a **gift buyer**,
I want **to purchase the HD image as a gift for someone else**,
so that **I can surprise the expecting parent**.

## Acceptance Criteria

1. **AC-1:** Given I'm viewing a shared result, when I tap "Gift This Photo", then the Stripe session is created with type="gift" in metadata
2. **AC-2:** I enter my email for receipt
3. **AC-3:** The original uploader receives the HD download link via email
4. **AC-4:** I receive a confirmation email
5. **AC-5:** The gift CTA explains "The HD photo will be sent to the parent"
6. **AC-6:** Gift purchases are tracked separately in analytics

## Tasks / Subtasks

- [x] **Task 1: Create share page with gift CTA** (AC: 1, 5)
  - [x] Create `apps/web/src/routes/share.$shareId.tsx`
  - [x] Display watermarked preview image
  - [x] Show "Gift This Photo" button prominently
  - [x] Add explanatory text: "The HD photo will be sent to the parent"
  - [x] Style with gift-appropriate colors/icons

- [x] **Task 2: Create gift checkout flow** (AC: 1, 2)
  - [x] Add gift email capture modal/form before checkout
  - [x] Collect purchaser's email (for receipt)
  - [x] Update checkout API to accept type: "gift"
  - [x] Create Stripe session with gift metadata

- [x] **Task 3: Update webhook for gift purchases** (AC: 3, 4)
  - [x] Detect type="gift" in session metadata
  - [x] Send download email to original uploader (from upload.email)
  - [x] Send confirmation/receipt to purchaser (session.customer_email)
  - [x] Include gift-specific copy in emails

- [x] **Task 4: Create gift confirmation email** (AC: 4)
  - [x] Create template for gift purchaser
  - [x] Confirm gift was sent
  - [x] Include receipt details
  - [x] Warm, thank-you tone

- [x] **Task 5: Create gift notification email** (AC: 3)
  - [x] Create template for gift recipient (uploader)
  - [x] "Someone special gifted you the HD photo!"
  - [x] Include download button
  - [x] Celebratory, surprise tone

- [x] **Task 6: Add gift analytics** (AC: 6)
  - [x] Track `gift_purchase_started` on CTA click
  - [x] Track `gift_purchase_completed` on webhook
  - [x] Include: share_id, amount
  - [x] Separate funnel for gift conversions

- [x] **Task 7: Write tests**
  - [x] Unit test: Gift checkout creates session with type="gift"
  - [x] Unit test: Webhook sends emails to both parties
  - [x] Unit test: Gift email templates render correctly
  - [ ] E2E test: Full gift purchase flow (deferred to integration testing)

## Dev Notes

### Architecture Compliance

- **Route:** Share page at `/share/:shareId`
- **Service Pattern:** PurchaseService handles gift metadata
- **Email:** ResendService with gift-specific templates

### Share Page Design

```typescript
// apps/web/src/routes/share.$shareId.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

export const Route = createFileRoute("/share/$shareId")({
  component: SharePage,
})

function SharePage() {
  const { shareId } = Route.useParams()

  // Fetch shared result (public, no auth needed)
  const { data: result } = useQuery({
    queryKey: ["share", shareId],
    queryFn: () => fetch(`/api/share/${shareId}`).then((r) => r.json()),
  })

  return (
    <div className="min-h-screen bg-cream">
      {/* Preview Image */}
      <img
        src={result?.previewUrl}
        alt="AI-generated baby portrait"
        className="w-full max-w-md mx-auto rounded-2xl shadow-lg"
      />

      {/* Gift CTA */}
      <div className="mt-6 p-4">
        <p className="text-warm-gray text-center mb-4">
          Someone created this beautiful portrait with babypeek!
        </p>

        <GiftCheckoutButton shareId={shareId} uploadId={result?.uploadId} />

        <p className="text-sm text-warm-gray/70 text-center mt-2">
          The HD photo will be sent to the parent
        </p>
      </div>

      {/* Try it yourself CTA */}
      <div className="mt-8 text-center">
        <p className="text-warm-gray mb-2">Want your own?</p>
        <Button variant="outline" asChild>
          <Link to="/">Try babypeek</Link>
        </Button>
      </div>
    </div>
  )
}
```

### Gift Checkout Button

```typescript
// apps/web/src/components/payment/GiftCheckoutButton.tsx
interface GiftCheckoutButtonProps {
  shareId: string
  uploadId: string
}

export function GiftCheckoutButton({ shareId, uploadId }: GiftCheckoutButtonProps) {
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState("")

  const handleGiftPurchase = async () => {
    posthog.capture("gift_purchase_started", { share_id: shareId })

    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        type: "gift",
        purchaserEmail: email, // For receipt
      }),
    })

    const { checkoutUrl } = await response.json()
    window.location.href = checkoutUrl
  }

  return (
    <>
      <Button
        size="lg"
        className="w-full bg-coral hover:bg-coral/90"
        onClick={() => setShowEmailModal(true)}
      >
        🎁 Gift This Photo - $9.99
      </Button>

      {/* Email capture modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gift This Photo</DialogTitle>
            <DialogDescription>
              Enter your email to receive your receipt.
              The HD photo will be sent directly to the parent.
            </DialogDescription>
          </DialogHeader>

          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <DialogFooter>
            <Button onClick={handleGiftPurchase} disabled={!email}>
              Continue to Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### Share API Endpoint

```typescript
// apps/server/src/routes/share.ts
// GET /api/share/:shareId
// Returns public info for share page (no auth required)

app.get("/:shareId", async (c) => {
  const shareId = c.req.param("shareId")

  // shareId is the uploadId
  const upload = await db.query.uploads.findFirst({
    where: eq(uploads.id, shareId),
  })

  if (!upload || !upload.previewUrl) {
    return c.json({ error: "Not found" }, 404)
  }

  return c.json({
    shareId,
    uploadId: upload.id,
    previewUrl: upload.previewUrl,
    // Do NOT include: email, sessionToken, resultUrl
  })
})
```

### Gift Email Templates

**Gift Confirmation (to purchaser):**

```html
<h1>Thank You for Your Gift! 🎁</h1>
<p>Your thoughtful gift has been sent!</p>
<p>The expecting parent will receive their HD photo shortly.</p>
<p><strong>Amount:</strong> $9.99</p>
<p><strong>Order ID:</strong> ${purchaseId}</p>
```

**Gift Notification (to recipient):**

```html
<h1>Someone Special Gifted You! 🎉</h1>
<p>A friend or family member just unlocked your HD baby portrait!</p>
<a href="${downloadUrl}">Download Your HD Photo</a>
<p>This download link is active for 30 days.</p>
```

### Checkout API Update

```typescript
// POST /api/checkout
// Accept type: "gift" and purchaserEmail
interface CheckoutRequest {
  uploadId: string
  type?: "self" | "gift"
  purchaserEmail?: string // Required for gift
}

// In handler:
if (type === "gift") {
  if (!purchaserEmail) {
    return c.json({ error: "Purchaser email required for gift" }, 400)
  }
  // Use purchaserEmail as customer_email in Stripe
  // Store original email in metadata for download link
}
```

### File Structure

```
apps/web/src/routes/
├── share.$shareId.tsx           <- NEW: Share page with gift CTA

apps/web/src/components/payment/
├── GiftCheckoutButton.tsx       <- NEW: Gift purchase button
├── GiftCheckoutButton.test.tsx  <- NEW: Tests

apps/server/src/routes/
├── share.ts                     <- NEW: Share API endpoint
├── checkout.ts                  <- UPDATE: Handle gift type

packages/api/src/services/
├── ResendService.ts             <- UPDATE: Gift email templates
```

### Dependencies

- **Story 6.1-6.5:** Core payment flow complete
- **Story 8.4 (Share Page):** Uses same shareId concept
- **Database:** purchases.isGift, giftRecipientEmail already in schema

### What This Enables

- Viral loop: share → gift → new user
- Revenue from gift purchases
- Story 8.5 (Gift CTA on share page)

### References

- [Source: _bmad-output/epics.md#Story 6.7] - Acceptance criteria
- [Source: _bmad-output/prd.md#FR-4.5] - Gift purchase option
- [Source: _bmad-output/prd.md#FR-6.6] - Gift purchase CTA on share page
- [Source: packages/db/src/schema/index.ts#purchases] - isGift, giftRecipientEmail columns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (2025-12-21)

### Debug Log References

N/A - Implementation completed without major issues.

### Completion Notes List

- **Task 1-2**: Created share page route (`/share/:shareId`) and GiftCheckoutButton component with email capture modal. Added new Dialog UI component.
- **Task 2**: Added `/api/checkout/gift` endpoint for public gift checkout. Updated PurchaseService with `createGiftCheckout` method and StripeService with `purchaserEmail` support.
- **Task 3**: Updated webhook handler to detect gift purchases and route emails accordingly using new gift email methods.
- **Task 4-5**: Added `sendGiftConfirmationEmail` and `sendGiftNotificationEmail` methods to ResendService with celebratory/thank-you templates.
- **Task 6**: Analytics events: `gift_purchase_started`, `gift_checkout_created`, `gift_checkout_error`, `gift_purchase_completed`, `gift_emails_sent` all in place.
- **Task 7**: Added comprehensive unit tests for share route, GiftCheckoutButton, PurchaseService gift checkout, and ResendService gift templates. All 298 tests passing.

### Senior Developer Review (AI)

**Review Date:** 2025-12-21  
**Review Outcome:** Changes Requested → Fixed  
**Action Items:** 2 High, 3 Medium, 3 Low

#### Action Items (All Resolved)

- [x] **[HIGH] H2:** Missing duplicate gift purchase check - Added pending purchase validation in `createGiftCheckout`
- [x] **[MEDIUM] M1:** Loading state not reset on modal reopen - Reset `isLoading` and `emailError` in `handleOpenModal`
- [x] **[MEDIUM] M2:** Missing test for duplicate prevention - Added 2 tests for duplicate gift purchase scenarios
- [x] **[MEDIUM] M3:** File List incomplete - Updated to include auto-generated file
- [x] **[LOW] L1-L3:** Acknowledged minor issues - Not blocking

### File List

**New Files:**

- `apps/web/src/routes/share.$shareId.tsx` - Share page with gift CTA
- `apps/web/src/components/payment/GiftCheckoutButton.tsx` - Gift checkout button with email modal
- `apps/web/src/components/payment/GiftCheckoutButton.test.tsx` - Tests for gift button
- `apps/web/src/components/ui/dialog.tsx` - Dialog UI component
- `packages/api/src/routes/share.ts` - Public share API endpoint
- `packages/api/src/routes/share.test.ts` - Share route tests

**Modified Files:**

- `packages/api/src/services/PurchaseService.ts` - Added createGiftCheckout method + H2 duplicate check fix
- `packages/api/src/services/PurchaseService.test.ts` - Added gift checkout tests + M2 duplicate prevention tests
- `packages/api/src/services/StripeService.ts` - Added purchaserEmail support
- `packages/api/src/services/ResendService.ts` - Added gift email methods and templates
- `packages/api/src/services/ResendService.test.ts` - Added gift email tests
- `packages/api/src/routes/checkout.ts` - Added /gift endpoint
- `packages/api/src/routes/webhook.ts` - Updated for gift email handling
- `packages/api/src/index.ts` - Export shareRoutes
- `apps/server/src/index.ts` - Register share routes
- `apps/web/src/components/payment/index.ts` - Export GiftCheckoutButton
- `apps/web/src/routeTree.gen.ts` - Auto-generated route tree (TanStack Router)

## Change Log

| Date       | Change                                                            | Author          |
| ---------- | ----------------------------------------------------------------- | --------------- |
| 2025-12-21 | Story implementation completed - all ACs satisfied                | Claude Opus 4.5 |
| 2025-12-21 | Code review fixes: H2 duplicate check, M1 loading reset, M2 tests | Claude Opus 4.5 |
