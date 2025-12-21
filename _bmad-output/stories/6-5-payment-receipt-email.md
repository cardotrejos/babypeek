# Story 6.5: Payment Receipt Email

Status: ready-for-dev

## Story

As a **user**,
I want **a receipt emailed after purchase**,
so that **I have proof of payment**.

## Acceptance Criteria

1. **AC-1:** Given my payment is successful, when the purchase is recorded, then an email is sent via Resend
2. **AC-2:** The email includes purchase amount and date
3. **AC-3:** The email includes a link to download the HD image
4. **AC-4:** The email is warm and congratulatory in tone
5. **AC-5:** Email delivery is tracked (>95% target per NFR-4.4)
6. **AC-6:** Email is sent to purchaser (may differ from uploader for gifts)

## Tasks / Subtasks

- [ ] **Task 1: Enhance ResendService.sendReceiptEmail** (AC: 1, 2, 3, 4)
  - [ ] Update `packages/api/src/services/ResendService.ts`
  - [ ] Accept: email, purchaseId, amount, uploadId, isGift
  - [ ] Include formatted amount ($9.99)
  - [ ] Include purchase date
  - [ ] Include download link: `${APP_URL}/download/${uploadId}`
  - [ ] Use warm, congratulatory copy

- [ ] **Task 2: Create receipt email template** (AC: 4)
  - [ ] Create HTML email template with:
    - Celebratory header ("Your HD photo is ready! 🎉")
    - Purchase confirmation details
    - Prominent download button
    - 30-day access reminder
  - [ ] Use inline CSS for email client compatibility
  - [ ] Test rendering in common email clients

- [ ] **Task 3: Add email to webhook flow** (AC: 1, 6)
  - [ ] Update webhook handler to call sendReceiptEmail after purchase created
  - [ ] For regular purchases: send to session.customer_email
  - [ ] For gift purchases: send to purchaser AND recipient
  - [ ] Handle email errors gracefully (don't fail webhook)

- [ ] **Task 4: Add email delivery tracking** (AC: 5)
  - [ ] Track `receipt_email_sent` event in PostHog
  - [ ] Include: upload_id, is_gift, email_provider
  - [ ] Log Resend message ID for debugging
  - [ ] Monitor delivery rate in Resend dashboard

- [ ] **Task 5: Write tests**
  - [ ] Unit test: sendReceiptEmail formats amount correctly
  - [ ] Unit test: Email includes all required fields
  - [ ] Unit test: Gift purchase sends to both parties
  - [ ] Integration test: Webhook triggers email send

## Dev Notes

### Architecture Compliance

- **Service Pattern:** ResendService using Effect
- **Email Provider:** Resend (already configured)
- **Templates:** HTML with inline CSS (no external framework)

### Existing Code to Leverage

**ResendService.sendReceiptEmail** already exists but needs enhancement:
```typescript
sendReceiptEmail: (email: string, purchaseId: string, amount: number) => Effect.Effect<void, EmailError>
```

### Enhanced Receipt Email Implementation

```typescript
// packages/api/src/services/ResendService.ts

interface ReceiptEmailParams {
  email: string
  purchaseId: string
  uploadId: string
  amount: number // cents
  isGift: boolean
  recipientEmail?: string // for gift purchases
}

const sendReceiptEmail = Effect.fn("ResendService.sendReceiptEmail")(function* (
  params: ReceiptEmailParams
) {
  const resend = yield* getResendClient()
  const formattedAmount = `$${(params.amount / 100).toFixed(2)}`
  const downloadUrl = `${env.APP_URL}/download/${params.uploadId}`
  const purchaseDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  yield* Effect.tryPromise({
    try: () =>
      resend.emails.send({
        from: getFromEmail(),
        to: params.email,
        subject: "Your 3d-ultra HD photo is ready! 🎉",
        html: generateReceiptHtml({
          amount: formattedAmount,
          date: purchaseDate,
          downloadUrl,
          isGift: params.isGift,
          purchaseId: params.purchaseId,
        }),
      }),
    catch: (e) =>
      new EmailError({
        cause: "SEND_FAILED",
        message: String(e),
      }),
  }).pipe(
    Effect.asVoid,
    Effect.retry({ times: 2, schedule: Schedule.exponential("500 millis") }),
    Effect.timeout("30 seconds"),
    Effect.catchTag("TimeoutException", () =>
      Effect.fail(new EmailError({ cause: "SEND_FAILED", message: "Email send timed out" }))
    )
  )
})
```

### Email Template

```typescript
const generateReceiptHtml = (params: {
  amount: string
  date: string
  downloadUrl: string
  isGift: boolean
  purchaseId: string
}) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FDF8F5;">
  <div style="background-color: white; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <h1 style="color: #E8927C; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin-bottom: 8px; text-align: center;">
      Your HD Photo is Ready! 🎉
    </h1>
    
    <p style="color: #6B5B5B; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
      ${params.isGift 
        ? "Thank you for your thoughtful gift! The HD photo has been unlocked."
        : "Thank you for your purchase! Your beautiful HD photo is waiting for you."
      }
    </p>
    
    <!-- Download Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.downloadUrl}" style="display: inline-block; background-color: #E8927C; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Download HD Photo
      </a>
    </div>
    
    <!-- Purchase Details -->
    <div style="background-color: #FDF8F5; border-radius: 8px; padding: 16px; margin-top: 24px;">
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Amount:</strong> ${params.amount}
      </p>
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Date:</strong> ${params.date}
      </p>
      <p style="color: #6B5B5B; font-size: 14px; margin: 4px 0;">
        <strong>Order ID:</strong> ${params.purchaseId}
      </p>
    </div>
    
    <!-- Footer -->
    <p style="color: #9B8B8B; font-size: 12px; text-align: center; margin-top: 24px;">
      Your download link will remain active for 30 days.
      <br>
      Questions? Reply to this email.
    </p>
    
  </div>
</body>
</html>
`
```

### Gift Purchase Email Flow

```typescript
// In webhook handler
if (isGift) {
  // Email 1: To purchaser (receipt)
  yield* ResendService.sendReceiptEmail({
    email: session.customer_email!, // purchaser's email
    purchaseId: purchase.id,
    uploadId,
    amount: session.amount_total!,
    isGift: true,
  })
  
  // Email 2: To recipient (download link)
  yield* ResendService.sendDownloadEmail(
    metadata.email, // original uploader's email
    uploadId,
    `${env.APP_URL}/download/${uploadId}`
  )
} else {
  // Regular purchase: one email
  yield* ResendService.sendReceiptEmail({
    email: session.customer_email!,
    purchaseId: purchase.id,
    uploadId,
    amount: session.amount_total!,
    isGift: false,
  })
}
```

### File Structure

```
packages/api/src/services/
├── ResendService.ts         <- UPDATE: Enhanced receipt email
├── ResendService.test.ts    <- UPDATE: New tests

packages/api/src/templates/
├── receipt-email.ts         <- NEW: Email template (optional, can inline)
```

### Dependencies

- **Story 6.4 (Purchase Record):** Provides purchase data
- **Existing ResendService:** ✅ Already configured
- **Story 7.4 (Download Email):** Similar pattern

### What This Enables

- User has proof of purchase
- Download link accessible via email
- Gift recipient notified

### References

- [Source: _bmad-output/epics.md#Story 6.5] - Acceptance criteria
- [Source: _bmad-output/prd.md#FR-4.6] - Payment receipt email requirement
- [Source: packages/api/src/services/ResendService.ts] - Existing service
- [Source: _bmad-output/ux-design-specification.md] - Warm tone guidelines

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
