
# Product Requirements Document: 3d-ultra

**Version:** 1.0  
**Date:** 2024-12-20  
**Author:** PM Agent  
**Status:** Complete

---

## Executive Summary

### Vision
3d-ultra transforms expecting parents' 4D ultrasound images into photorealistic "baby's first photo" using AI image generation. The product delivers an emotional, shareable moment that drives viral growth and monetizes through HD image downloads.

### Success Vision
*"A mother uploads her 4D ultrasound at 10 PM. Sixty seconds later, she's crying happy tears at her phone, showing her partner what their baby might look like. Within an hour, she's shared it to three WhatsApp groups. By morning, her mother has purchased the HD version as a gift, and two friends have uploaded their own ultrasounds."*

### Market Validation
- Linus Ekenstam's viral posts generated massive engagement
- Comments filled with parents begging to try it
- No accessible product exists in the market
- First-mover advantage available

---

## Success Criteria

### Primary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Upload → Preview Conversion | 80%+ | Uploads that complete processing |
| Preview → Purchase Conversion | 20%+ | Previews that convert to paid |
| Share Rate | 40%+ | Results shared within 24h |
| Time to Reveal | <90 seconds | Upload to viewable result |
| Quality Pass Rate | 85%+ | Results meeting quality bar |

### Secondary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| CAC (organic) | <$2 | Cost per acquired user |
| Referral Rate | 15%+ | New users from shares |
| Gift Purchase Rate | 10%+ | Purchases by non-uploaders |
| Customer Satisfaction | 90%+ | Positive feedback |
| Refund Rate | <5% | Refund requests |

### Business Targets

| Milestone | Target | Timeframe |
|-----------|--------|-----------|
| First revenue | $100 | Week 1 |
| First $1K month | $1,000 | Month 2 |
| First $10K month | $10,000 | Month 4 |

---

## User Journeys

### Journey 1: Maria (Self-Purchase)

**Context:** Maria is 28 weeks pregnant, just had her 4D ultrasound, excited to share.

**Flow:**
1. **Discovery:** Sees friend's share on Instagram
2. **Landing:** Reads "Meet your baby before they're born"
3. **Upload:** Selects ultrasound from camera roll
4. **Email:** Enters email for delivery
5. **Wait:** Watches progress animation (60 seconds)
6. **Reveal:** Blur-to-sharp animation reveals result
7. **Emotion:** Gasps, shows partner, tears up
8. **Share:** Sends to WhatsApp family group (watermarked)
9. **Purchase:** Taps "Get HD Version" - Apple Pay - done
10. **Download:** Saves HD image to camera roll
11. **Share Again:** Posts HD version to Instagram story

**Success:** Maria shares within 24 hours, purchases in same session.

**Failure Paths:**
- Upload fails → Clear error, retry option
- AI quality poor → Apologize, offer retry or refund
- Payment fails → Retry, alternative payment

### Journey 2: Carlos (Gift Purchase)

**Context:** Carlos (Maria's father) receives WhatsApp share from Maria.

**Flow:**
1. **Discovery:** Receives WhatsApp message with preview image
2. **Click:** Taps link in message
3. **Landing:** Sees "Gift this photo to Maria"
4. **Emotion:** Touched by seeing grandchild
5. **Purchase:** "Buy HD as Gift" - enters payment
6. **Delivery:** Maria receives email with HD download
7. **Notification:** Carlos sees confirmation
8. **Connection:** Maria thanks Carlos on WhatsApp

**Success:** Carlos purchases gift in one session.

**Failure Paths:**
- Confused by flow → Clear "This is a gift" messaging
- Payment issues → Phone number for Stripe, Google Pay fallback

### Journey 3: Rosa (Viral Discovery)

**Context:** Rosa sees Maria's Instagram post, is also pregnant.

**Flow:**
1. **Discovery:** Sees "Made with 3d-ultra" watermark
2. **Curiosity:** Taps watermark/link
3. **Landing:** "Want this for your baby?"
4. **Upload:** Finds her own 4D ultrasound
5. **Complete Flow:** Same as Maria
6. **Become Advocate:** Shares her result, cycle continues

**Success:** Rosa completes full flow from viral discovery.

---

## Innovation & Novel Patterns

### Multi-Buyer Model
Same image can be purchased multiple times by different people:
- Parent purchases HD
- Grandparent purchases as gift
- Aunt purchases for their copy
- Each purchase is independent revenue

### Viral Watermark Strategy
Watermarked preview serves dual purpose:
- Low-quality enough to drive HD purchase
- High-quality enough to be shareable
- Includes subtle "3d-ultra.com" branding
- Every share is free marketing

### The Reveal Moment
The blur-to-sharp reveal animation is designed to:
- Build anticipation (emotional peak)
- Create memorable moment
- Maximize conversion opportunity
- Encourage immediate sharing

---

## Functional Requirements

### FR-1: Image Upload & Processing

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Accept JPEG, PNG, HEIC image formats | Must |
| FR-1.2 | Maximum file size 25MB | Must |
| FR-1.3 | Convert HEIC to JPEG client-side | Must |
| FR-1.4 | Compress images >5MB client-side | Must |
| FR-1.5 | Validate image is ultrasound-like | Should |
| FR-1.6 | Show upload progress indicator | Must |
| FR-1.7 | Handle upload interruption gracefully | Must |
| FR-1.8 | Direct upload to R2 via presigned URL | Must |

### FR-2: AI Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Process image through Gemini Imagen 3 | Must |
| FR-2.2 | Use structured prompt template | Must |
| FR-2.3 | Complete processing in <90 seconds | Must |
| FR-2.4 | Retry on transient failures (3x) | Must |
| FR-2.5 | Quality validation before delivery | Should |
| FR-2.6 | Store both original and result | Must |

### FR-3: Preview & Results

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Generate watermarked preview image | Must |
| FR-3.2 | Watermark: 40% opacity, corner position | Must |
| FR-3.3 | Preview resolution: 800px max dimension | Must |
| FR-3.4 | Blur-to-sharp reveal animation | Must |
| FR-3.5 | Before/after comparison slider | Should |
| FR-3.6 | Download preview with watermark | Must |

### FR-4: Payment & Purchase

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Stripe payment integration | Must |
| FR-4.2 | Apple Pay support | Must |
| FR-4.3 | Google Pay support | Must |
| FR-4.4 | Price points: $9.99, $14.99 | Must |
| FR-4.5 | Gift purchase option | Should |
| FR-4.6 | Payment receipt email | Must |
| FR-4.7 | Handle failed payments gracefully | Must |

### FR-5: Download & Delivery

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Generate HD image (full resolution) | Must |
| FR-5.2 | Secure download link (signed URL) | Must |
| FR-5.3 | Download link expires in 7 days | Must |
| FR-5.4 | Email HD download link | Must |
| FR-5.5 | In-app download button | Must |
| FR-5.6 | Support re-download within 30 days | Should |

### FR-6: Sharing & Viral Loop

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | WhatsApp share button | Must |
| FR-6.2 | iMessage share button | Must |
| FR-6.3 | Copy link button | Must |
| FR-6.4 | Instagram story share | Should |
| FR-6.5 | Share page shows watermarked preview | Must |
| FR-6.6 | Gift purchase CTA on share page | Must |

### FR-7: Landing & Discovery

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | Mobile-optimized landing page | Must |
| FR-7.2 | Clear value proposition | Must |
| FR-7.3 | Before/after example gallery | Should |
| FR-7.4 | Trust signals (privacy, security) | Must |
| FR-7.5 | FAQ section | Should |
| FR-7.6 | SEO optimization | Should |

### FR-8: System Operations

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-8.1 | Email delivery via Resend | Must |
| FR-8.2 | Analytics via PostHog | Should |
| FR-8.3 | Error tracking via Sentry | Should |
| FR-8.4 | Rate limiting (10 uploads/IP/hour) | Must |
| FR-8.5 | Auto-delete images after 30 days | Should |
| FR-8.6 | Admin dashboard for monitoring | Could |

---

## Non-Functional Requirements

### NFR-1: Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1.1 | Landing page LCP | <2.5s |
| NFR-1.2 | Time to Interactive | <3.5s |
| NFR-1.3 | Upload start latency | <500ms |
| NFR-1.4 | AI processing time | <90s |
| NFR-1.5 | Reveal animation FPS | 60fps |
| NFR-1.6 | Bundle size (initial) | <150KB |

### NFR-2: Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-2.1 | HTTPS everywhere | Required |
| NFR-2.2 | Signed URLs for all images | Required |
| NFR-2.3 | Rate limiting | 10/IP/hour |
| NFR-2.4 | Input validation | All inputs |
| NFR-2.5 | CORS configured properly | Required |
| NFR-2.6 | No PII in logs | Required |

### NFR-3: Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-3.1 | Concurrent uploads | 100+ |
| NFR-3.2 | Daily capacity | 10,000 images |
| NFR-3.3 | Auto-scaling | Serverless |
| NFR-3.4 | CDN for static assets | Required |
| NFR-3.5 | Queue-based processing | Required |

### NFR-4: Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-4.1 | Uptime | 99.5% |
| NFR-4.2 | Error rate | <1% |
| NFR-4.3 | Payment success rate | >98% |
| NFR-4.4 | Email delivery rate | >95% |
| NFR-4.5 | Data durability | 99.99% |

### NFR-5: Accessibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-5.1 | WCAG 2.1 Level AA | Required |
| NFR-5.2 | Keyboard navigation | Required |
| NFR-5.3 | Screen reader support | Required |
| NFR-5.4 | Color contrast | 4.5:1 minimum |
| NFR-5.5 | Touch targets | 48px minimum |

### NFR-6: Browser Support

| Browser | Versions |
|---------|----------|
| Safari iOS | Last 2 |
| Chrome Android | Last 2 |
| Chrome Desktop | Last 2 |
| Safari Desktop | Last 2 |
| Firefox | Last 2 |
| Edge | Last 2 |

---

## Technical Architecture Considerations

### Frontend
- **Framework:** Tanstack Start
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** TanStack Query
- **Forms:** React Hook Form + Zod

### Backend
- **Runtime:** Hono on Cloudflare Workers
- **Database:** Drizzle ORM + PostgreSQL
- **Queue:** Cloudflare Queue or similar
- **Storage:** Cloudflare R2

### External Services
- **AI:** Gemini Imagen 3 API
- **Payments:** Stripe
- **Email:** Resend
- **Analytics:** PostHog
- **Errors:** Sentry

### Image Processing
- **Client-side:** HEIC conversion, compression
- **Server-side:** Watermarking (Sharp)
- **Storage:** Original, result, watermarked versions

---

## MVP Scope

### Included in MVP
- [x] Mobile-optimized landing page
- [x] Image upload with validation
- [x] Email capture (no accounts)
- [x] AI processing pipeline
- [x] Reveal page with animation
- [x] Watermarked preview
- [x] Stripe payment (Apple Pay, Google Pay)
- [x] HD download delivery
- [x] Share buttons (WhatsApp, Copy link)
- [x] Basic analytics

### Deferred to V2
- [ ] Gift purchase flow
- [ ] User accounts
- [ ] Multiple image variations
- [ ] Before/after slider
- [ ] Print ordering
- [ ] Referral tracking
- [ ] Admin dashboard

---

## Development Timeline

### Week 1: Foundation
- Project setup (TanStack Start, Tailwind)
- Landing page
- Image upload component
- R2 storage integration

### Week 2: Core Pipeline
- AI integration (Gemini Imagen 3)
- Watermarking
- Email delivery (Resend)
- Processing queue

### Week 3: Monetization
- Reveal page with animation
- Stripe integration
- HD download flow
- Share functionality

### Week 4: Polish & Launch
- Error handling
- Analytics
- Performance optimization
- Testing & soft launch

---

## Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AI quality inconsistent | Medium | High | Quality prompts, validation, retry |
| HEIC conversion fails | Low | Medium | Fallback, clear error messages |
| Scale issues at viral spike | Medium | High | Serverless, queue-based, monitoring |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low conversion rate | Medium | High | A/B testing, UX optimization |
| Privacy backlash | Low | High | Clear policy, GDPR compliance |
| Competition enters | Medium | Medium | Speed to market, brand building |

---

## Analytics Events

### Funnel Events
| Event | Properties |
|-------|------------|
| `page_view` | page, referrer |
| `upload_started` | file_type, file_size |
| `upload_completed` | duration |
| `processing_started` | - |
| `processing_completed` | duration |
| `reveal_viewed` | - |
| `share_clicked` | platform |
| `purchase_started` | amount |
| `purchase_completed` | amount, method |
| `download_clicked` | - |

### Quality Events
| Event | Properties |
|-------|------------|
| `upload_failed` | error_type |
| `processing_failed` | error_type |
| `payment_failed` | error_type |

---

## Open Questions

1. **Pricing:** $9.99 or $14.99 for standard? Need A/B testing.
2. **Refund policy:** Full refund on quality issues? Time limit?
3. **Data retention:** 30 days? 90 days? Forever for paid?
4. **Multiple uploads:** Allow retry with same email?
5. **Gift messaging:** Custom message from gift buyer?

---

## Appendix

### Competitive Landscape
- No direct competitors with accessible product
- Manual artists charge $100+ and take days
- DIY with AI tools requires expertise
- First-mover advantage available

### Regulatory Considerations
- GDPR compliance for EU users
- Clear data handling policy
- No medical claims about accuracy
- Opt-in email communications

---

*PRD Complete. Ready for UX Design and Architecture workflows.*
