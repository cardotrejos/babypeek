# Brainstorming Session: babypeek

**Date:** 2024-12-20  
**Facilitator:** Analyst Agent  
**Project:** AI-Powered 4D Ultrasound to Photorealistic Baby Portrait

---

## Session Overview

### The Vision

Transform 4D ultrasound images into ultra-realistic "baby's first photo" using AI image generation. Inspired by Linus Ekenstam's viral approach that generated massive engagement with structured prompts and image-to-image editing.

### The Opportunity

- **Proven demand:** Linus's posts went viral with parents desperate to try it
- **Technical feasibility:** Gemini Imagen 3 / Nano Banana Pro can achieve similar quality
- **Emotional product:** Parents will pay premium for this magical moment
- **Scalable:** Once pipeline is built, marginal cost per image is minimal

---

## Key Ideas Generated

### 1. Core Product Flow

1. Parent uploads 4D ultrasound image
2. Enters email (no account creation friction)
3. AI processes image (60-90 seconds)
4. Email with watermarked preview sent
5. View result on web with "reveal moment"
6. Pay for HD download ($9.99-$19.99)

### 2. The Reveal Moment (Critical UX)

- Build anticipation during processing
- Blur-to-sharp reveal animation
- Emotional peak = conversion opportunity
- Share button immediately available

### 3. Viral Loop Mechanics

- **Watermarked preview** = free marketing when shared
- **Gift purchase** = others can buy HD for expecting parents
- **Multiple buyers** = same image can be purchased by grandparents, etc.

### 4. Technical Pipeline

- **Input:** 4D ultrasound (HEIC, JPEG, PNG)
- **Processing:** Client-side compression, HEIC conversion
- **AI:** Gemini Imagen 3 with structured prompt
- **Storage:** R2/S3 with presigned URLs
- **Delivery:** Resend for email, secure download links

### 5. Revenue Model

- **Self-purchase:** $9.99-$14.99 for HD download
- **Gift purchase:** $14.99-$19.99 (premium for gift experience)
- **Upsells:** Print options, multiple variations (future)

---

## Technical Decisions

### Stack

- **Frontend:** TanStack Start + React + Tailwind
- **Backend:** Hono API
- **Database:** Drizzle ORM
- **Payments:** Stripe (Apple Pay, Google Pay)
- **Email:** Resend
- **Hosting:** Vercel/Cloudflare
- **Storage:** Cloudflare R2

### AI Model

- **Primary:** Gemini Imagen 3 via API
- **Fallback:** Consider alternatives if quality issues

### Image Handling

- Client-side validation and compression
- HEIC to JPEG conversion in browser
- Direct upload to R2 via presigned URL
- Server-side watermarking (ImageMagick/Sharp)

---

## User Personas Identified

### Maria (Primary)

- 28, first-time expecting mother
- Active on WhatsApp family groups
- Wants to share excitement with family
- Price-insensitive for baby-related products

### Carlos (Secondary - Gift Buyer)

- 55, soon-to-be grandfather
- Less tech-savvy but motivated
- Wants to surprise daughter
- Willing to pay premium

### Rosa (Tertiary - Viral Discovery)

- 32, sees friend's share on Instagram
- Currently pregnant, wants same for her baby
- Referral/viral acquisition

---

## Success Metrics Defined

### Primary

- **Conversion rate:** Upload → Purchase (target: 15-25%)
- **Share rate:** Results shared within 24h (target: 40%+)
- **Revenue per upload:** (target: $3-5 blended)

### Secondary

- **Time to reveal:** Processing + delivery (target: <90 seconds)
- **Quality satisfaction:** Positive feedback (target: 90%+)
- **Referral rate:** New users from shares (target: 10%+)

---

## Risks & Mitigations

| Risk                         | Mitigation                                     |
| ---------------------------- | ---------------------------------------------- |
| AI quality inconsistent      | Curated prompts, quality checks, refund policy |
| HEIC/mobile upload issues    | Client-side conversion, graceful fallbacks     |
| Viral spike overwhelms infra | Serverless, queue-based processing             |
| Payment friction on mobile   | Apple Pay, Google Pay, minimal fields          |
| Privacy concerns             | Clear data policy, auto-deletion, GDPR ready   |

---

## MVP Scope (3-4 weeks)

### Must Have

- [ ] Image upload (mobile-optimized)
- [ ] AI processing pipeline
- [ ] Email delivery with preview
- [ ] Reveal page with animation
- [ ] Stripe payment
- [ ] HD download

### Should Have

- [ ] Gift purchase flow
- [ ] Share buttons (WhatsApp, iMessage)
- [ ] Basic analytics

### Won't Have (V1)

- User accounts
- Multiple image variations
- Print ordering
- API for third parties

---

## Next Steps

1. **Create Product Brief** → Formalize vision and scope
2. **Create PRD** → Detailed requirements
3. **UX Design** → Design the emotional journey
4. **Architecture** → Technical design
5. **Build MVP** → Ship it!

---

_Session complete. Ready for Product Brief workflow._
