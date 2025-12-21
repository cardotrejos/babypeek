---
workflow: create-epics-and-stories
project: 3d-ultra
started: 2024-12-20
lastStep: 3
stepsCompleted: [1, 2, 3]
status: in-progress
currentEpic: 1
currentStory: 1.1
inputDocuments:
  - _bmad-output/prd.md
  - _bmad-output/architecture.md
  - _bmad-output/ux-design-specification.md
---

# 3d-ultra - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for 3d-ultra, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**FR-1: Image Upload & Processing**
- FR-1.1: Accept JPEG, PNG, HEIC image formats (Must)
- FR-1.2: Maximum file size 25MB (Must)
- FR-1.3: Convert HEIC to JPEG client-side (Must)
- FR-1.4: Compress images >5MB client-side (Must)
- FR-1.5: Validate image is ultrasound-like (Should)
- FR-1.6: Show upload progress indicator (Must)
- FR-1.7: Handle upload interruption gracefully (Must)
- FR-1.8: Direct upload to R2 via presigned URL (Must)

**FR-2: AI Generation**
- FR-2.1: Process image through Gemini Imagen 3 (Must)
- FR-2.2: Use structured prompt template (Must)
- FR-2.3: Complete processing in <90 seconds (Must)
- FR-2.4: Retry on transient failures (3x) (Must)
- FR-2.5: Quality validation before delivery (Should)
- FR-2.6: Store both original and result (Must)

**FR-3: Preview & Results**
- FR-3.1: Generate watermarked preview image (Must)
- FR-3.2: Watermark: 40% opacity, corner position (Must)
- FR-3.3: Preview resolution: 800px max dimension (Must)
- FR-3.4: Blur-to-sharp reveal animation (Must)
- FR-3.5: Before/after comparison slider (Should)
- FR-3.6: Download preview with watermark (Must)

**FR-4: Payment & Purchase**
- FR-4.1: Stripe payment integration (Must)
- FR-4.2: Apple Pay support (Must)
- FR-4.3: Google Pay support (Must)
- FR-4.4: Price points: $9.99, $14.99 (Must)
- FR-4.5: Gift purchase option (Should)
- FR-4.6: Payment receipt email (Must)
- FR-4.7: Handle failed payments gracefully (Must)

**FR-5: Download & Delivery**
- FR-5.1: Generate HD image (full resolution) (Must)
- FR-5.2: Secure download link (signed URL) (Must)
- FR-5.3: Download link expires in 7 days (Must)
- FR-5.4: Email HD download link (Must)
- FR-5.5: In-app download button (Must)
- FR-5.6: Support re-download within 30 days (Should)

**FR-6: Sharing & Viral Loop**
- FR-6.1: WhatsApp share button (Must)
- FR-6.2: iMessage share button (Must)
- FR-6.3: Copy link button (Must)
- FR-6.4: Instagram story share (Should)
- FR-6.5: Share page shows watermarked preview (Must)
- FR-6.6: Gift purchase CTA on share page (Must)

**FR-7: Landing & Discovery**
- FR-7.1: Mobile-optimized landing page (Must)
- FR-7.2: Clear value proposition (Must)
- FR-7.3: Before/after example gallery (Should)
- FR-7.4: Trust signals (privacy, security) (Must)
- FR-7.5: FAQ section (Should)
- FR-7.6: SEO optimization (Should)

**FR-8: System Operations**
- FR-8.1: Email delivery via Resend (Must)
- FR-8.2: Analytics via PostHog (Should)
- FR-8.3: Error tracking via Sentry (Should)
- FR-8.4: Rate limiting (10 uploads/IP/hour) (Must)
- FR-8.5: Auto-delete images after 30 days (Should)
- FR-8.6: Admin dashboard for monitoring (Could) - DEFERRED

### Non-Functional Requirements

**NFR-1: Performance**
- NFR-1.1: Landing page LCP <2.5s
- NFR-1.2: Time to Interactive <3.5s
- NFR-1.3: Upload start latency <500ms
- NFR-1.4: AI processing time <90s
- NFR-1.5: Reveal animation 60fps
- NFR-1.6: Bundle size <150KB

**NFR-2: Security**
- NFR-2.1: HTTPS everywhere
- NFR-2.2: Signed URLs for all images
- NFR-2.3: Rate limiting 10/IP/hour
- NFR-2.4: Input validation on all inputs
- NFR-2.5: CORS configured properly
- NFR-2.6: No PII in logs

**NFR-3: Scalability**
- NFR-3.1: 100+ concurrent uploads
- NFR-3.2: 10,000 images/day capacity
- NFR-3.3: Auto-scaling (serverless)
- NFR-3.4: CDN for static assets
- NFR-3.5: Queue-based processing

**NFR-4: Reliability**
- NFR-4.1: 99.5% uptime
- NFR-4.2: <1% error rate
- NFR-4.3: >98% payment success rate
- NFR-4.4: >95% email delivery rate
- NFR-4.5: 99.99% data durability

**NFR-5: Accessibility**
- NFR-5.1: WCAG 2.1 Level AA
- NFR-5.2: Keyboard navigation
- NFR-5.3: Screen reader support
- NFR-5.4: Color contrast 4.5:1 minimum
- NFR-5.5: Touch targets 48px minimum

### Additional Requirements

**From Architecture:**
- Starter template: Better-T-Stack with Hono + Effect
- Vercel Pro hosting (60s function timeout)
- Cloudflare R2 storage with presigned URLs
- Neon PostgreSQL (serverless)
- Workflow (useworkflow.dev) for durable execution
- Effect Services for all business logic
- Typed errors with Data.TaggedError
- Session tokens for result access (localStorage + X-Session-Token header)
- Fire-and-forget upload pattern (return jobId immediately)
- Client-side HEIC conversion (heic2any) + compression (browser-image-compression)
- Dual rate limiting (Vercel edge + Hono app)
- GDPR: Delete button, hash/delete email, 30-day auto-deletion

**From UX Design:**
- Mobile-first design with bottom-aligned CTAs
- Blur-to-sharp reveal animation (2-3 seconds)
- Anticipation-building progress stages with baby facts
- Warm, reassuring error copy
- iOS/Android native share sheet integration
- Reduced motion support
- High contrast mode support

### FR Coverage Map

| FR Range | Epic | Domain |
|----------|------|--------|
| FR-1.1 – FR-1.8 | Epic 3 | Upload |
| FR-2.1 – FR-2.6 | Epic 4 | AI Processing |
| FR-3.1 – FR-3.6 | Epic 5 | Reveal |
| FR-4.1 – FR-4.7 | Epic 6 | Payment |
| FR-5.1 – FR-5.6 | Epic 7 | Download |
| FR-6.1 – FR-6.6 | Epic 8 | Sharing |
| FR-7.1 – FR-7.6 | Epic 2 | Landing |
| FR-8.1 | Epic 7 | Email |
| FR-8.2 – FR-8.3 | Epic 1 | Observability |
| FR-8.4 | Epic 3 | Rate Limiting |
| FR-8.5 | Epic 8 | Auto-delete |
| FR-8.6 | Deferred | Admin Dashboard |

**Coverage:** 53/54 FRs mapped (FR-8.6 deferred to post-MVP)

## Epic List

### Epic 1: Foundation & Observability
**User Outcome:** Development environment ready with monitoring from day one

**Goal:** Initialize project with Better-T-Stack + Effect, set up infrastructure connections, and establish observability so all issues are visible from the start.

**FRs covered:** FR-8.2, FR-8.3, Architecture requirements

**Includes:**
- Better-T-Stack project initialization
- Effect library setup
- Neon PostgreSQL connection + Drizzle schema
- Cloudflare R2 storage connection
- Environment variable configuration
- PostHog analytics setup
- Sentry error tracking
- CI/CD pipeline (GitHub Actions → Vercel)

---

### Epic 2: Landing Experience
**User Outcome:** Users discover 3d-ultra and understand its value proposition

**Goal:** A visitor lands on the page, instantly understands what 3d-ultra does, sees compelling before/after examples, and is motivated to try it.

**FRs covered:** FR-7.1, FR-7.2, FR-7.3, FR-7.4, FR-7.5, FR-7.6

**Includes:**
- Mobile-optimized landing page layout
- Hero section with clear value proposition
- Before/after example gallery
- Trust signals (privacy, security messaging)
- FAQ accordion
- SEO meta tags and structured data
- Performance optimization (<2.5s LCP)

---

### Epic 3: Image Upload
**User Outcome:** Users can upload their 4D ultrasound and initiate processing

**Goal:** User selects their ultrasound image, it's processed client-side (HEIC conversion, compression), uploaded to R2, and they receive a jobId to track progress.

**FRs covered:** FR-1.1, FR-1.2, FR-1.3, FR-1.4, FR-1.5, FR-1.6, FR-1.7, FR-1.8, FR-8.4

**Includes:**
- Image picker with format validation
- Client-side HEIC → JPEG conversion (heic2any)
- Client-side compression for large files
- Email capture input
- Presigned URL generation
- Direct R2 upload with progress
- Session token generation
- Rate limiting (edge + app)
- Error handling for failed uploads

---

### Epic 4: AI Processing
**User Outcome:** System generates photorealistic portrait from ultrasound

**Goal:** The uploaded ultrasound is processed through Gemini Imagen 3, generating a photorealistic baby portrait stored in R2.

**FRs covered:** FR-2.1, FR-2.2, FR-2.3, FR-2.4, FR-2.5, FR-2.6

**Includes:**
- Workflow job definition (useworkflow.dev)
- Gemini Imagen 3 API integration
- Structured prompt template
- Retry logic (3 attempts with exponential backoff)
- Quality validation checks
- Result storage in R2
- Status updates (stage + progress)
- Processing timeout handling (<90s)

---

### Epic 5: Reveal Experience
**User Outcome:** Users see an emotional blur-to-sharp reveal of their baby's portrait

**Goal:** After processing completes, user sees a stunning reveal animation that transitions from blurred to sharp, creating the emotional peak of the product.

**FRs covered:** FR-3.1, FR-3.2, FR-3.3, FR-3.4, FR-3.5, FR-3.6

**Includes:**
- Processing status page with progress stages
- Baby facts carousel during wait
- Watermark application (40% opacity, corner)
- Preview image sizing (800px max)
- Blur-to-sharp reveal animation (2-3s)
- Before/after comparison slider
- Download preview button
- Reduced motion alternative
- Result caching

---

### Epic 6: Payment
**User Outcome:** Users can purchase the HD version with Apple Pay, Google Pay, or card

**Goal:** After viewing the watermarked preview, user taps "Get HD Version" and completes purchase in seconds via Stripe.

**FRs covered:** FR-4.1, FR-4.2, FR-4.3, FR-4.4, FR-4.5, FR-4.6, FR-4.7

**Includes:**
- Stripe Checkout integration
- Apple Pay button
- Google Pay button
- Price display ($9.99 / $14.99)
- Gift purchase option
- Stripe webhook handler
- Purchase record creation
- Receipt email via Resend
- Payment failure handling
- Warm error messaging

---

### Epic 7: Download & Delivery
**User Outcome:** Users receive their HD photo via email and in-app download

**Goal:** After purchase, user gets immediate download access and an email with a secure 7-day download link.

**FRs covered:** FR-5.1, FR-5.2, FR-5.3, FR-5.4, FR-5.5, FR-5.6, FR-8.1

**Includes:**
- HD image retrieval (full resolution)
- Signed URL generation (7-day expiry)
- In-app download button
- Download email via Resend
- Re-download support (30 days)
- Download tracking
- Success confirmation UI

---

### Epic 8: Sharing & Viral Loop
**User Outcome:** Users share their result and drive viral growth

**Goal:** Users share watermarked preview to social platforms, and share recipients can view the preview and purchase as a gift.

**FRs covered:** FR-6.1, FR-6.2, FR-6.3, FR-6.4, FR-6.5, FR-6.6, FR-8.5

**Includes:**
- WhatsApp share button
- iMessage share button
- Copy link button
- Instagram story share (deep link)
- Share page with watermarked preview
- Gift purchase CTA
- "Delete my data" button (GDPR)
- Auto-delete after 30 days

---

## Epic Dependencies

```
Epic 1 (Foundation) ──┬── Epic 2 (Landing) ← Standalone entry point
                      │
                      └── Epic 3 (Upload)
                              ↓
                         Epic 4 (AI) ←──┐
                              ↓         │ Can be parallel
                         Epic 5 (Reveal)┘
                              ↓
                         Epic 6 (Payment)
                              ↓
                         Epic 7 (Download)
                              ↓
                         Epic 8 (Sharing)
```

**Parallel Work Opportunities:**
- Epic 2 (Landing) can be developed alongside Epic 3 (Upload)
- Epic 4 (AI/backend) and Epic 5 (Reveal/frontend) can be developed in parallel

---

## Epic 1: Foundation & Observability — Stories

### Story 1.1: Initialize Better-T-Stack Project

As a **developer**,  
I want **the project initialized with Better-T-Stack, Hono, and Effect**,  
So that **I have a working monorepo ready for feature development**.

**Acceptance Criteria:**

**Given** a fresh workspace  
**When** I run the initialization commands  
**Then** the project has `apps/web` (TanStack Start) and `packages/api` (Hono)  
**And** Effect is installed and configured  
**And** `bun run dev` starts both frontend and backend  
**And** TypeScript strict mode is enabled

---

### Story 1.2: Configure Neon PostgreSQL Connection

As a **developer**,  
I want **Neon PostgreSQL connected via Drizzle ORM**,  
So that **I can store and query data in the database**.

**Acceptance Criteria:**

**Given** Neon database credentials in environment  
**When** I run the application  
**Then** Drizzle connects to Neon without errors  
**And** `bun run db:push` syncs schema changes  
**And** `bun run db:studio` opens Drizzle Studio  
**And** connection pooling is configured for serverless

---

### Story 1.3: Configure Cloudflare R2 Storage

As a **developer**,  
I want **Cloudflare R2 configured with presigned URL support**,  
So that **I can upload and retrieve files securely**.

**Acceptance Criteria:**

**Given** R2 credentials in environment  
**When** I call the R2 service  
**Then** I can generate presigned upload URLs  
**And** I can generate presigned download URLs  
**And** URLs expire after the specified duration  
**And** CORS is configured for the web domain

---

### Story 1.4: Set Up Environment Configuration

As a **developer**,  
I want **Zod-validated environment variables**,  
So that **the app fails fast on missing or invalid config**.

**Acceptance Criteria:**

**Given** an `.env.example` file with all required variables  
**When** the application starts  
**Then** all environment variables are validated with Zod  
**And** missing required variables throw descriptive errors  
**And** sensitive values are never logged  
**And** type-safe `env` object is exported

---

### Story 1.5: Integrate PostHog Analytics

As a **developer**,  
I want **PostHog analytics integrated on frontend and backend**,  
So that **I can track user behavior and funnel metrics**.

**Acceptance Criteria:**

**Given** PostHog API key in environment  
**When** users interact with the app  
**Then** page views are tracked automatically  
**And** custom events can be fired from frontend  
**And** custom events can be fired from backend  
**And** user identification works with session tokens

---

### Story 1.6: Integrate Sentry Error Tracking

As a **developer**,  
I want **Sentry integrated for error tracking**,  
So that **I'm alerted to production errors immediately**.

**Acceptance Criteria:**

**Given** Sentry DSN in environment  
**When** an unhandled error occurs  
**Then** the error is reported to Sentry with stack trace  
**And** source maps are uploaded for readable traces  
**And** user context (session token, not PII) is attached  
**And** breadcrumbs show recent actions

---

### Story 1.7: Configure CI/CD Pipeline

As a **developer**,  
I want **GitHub Actions deploying to Vercel**,  
So that **code is automatically deployed on merge to main**.

**Acceptance Criteria:**

**Given** a pull request to main  
**When** the PR is merged  
**Then** Vercel deploys to production automatically  
**And** preview deployments are created for PRs  
**And** build failures block the deployment  
**And** environment variables are synced from Vercel

---

## Epic 2: Landing Experience — Stories

### Story 2.1: Mobile-Optimized Landing Layout

As a **visitor**,  
I want **a mobile-first landing page that loads fast**,  
So that **I can easily browse on my phone**.

**Acceptance Criteria:**

**Given** I visit 3d-ultra.com on mobile  
**When** the page loads  
**Then** LCP is under 2.5s  
**And** layout is single-column with no horizontal scroll  
**And** touch targets are at least 48px  
**And** bottom CTA button is thumb-reachable

---

### Story 2.2: Hero Section with Value Proposition

As a **visitor**,  
I want **to immediately understand what 3d-ultra does**,  
So that **I decide whether to try it**.

**Acceptance Criteria:**

**Given** I land on the homepage  
**When** I view the hero section  
**Then** I see a compelling headline ("Meet your baby before they're born")  
**And** I see a single before/after example image  
**And** I see a clear CTA button ("Try it free")  
**And** the CTA scrolls to upload section or navigates to upload page

---

### Story 2.3: Before/After Example Gallery

As a **visitor**,  
I want **to see multiple transformation examples**,  
So that **I'm convinced the quality is worth trying**.

**Acceptance Criteria:**

**Given** I scroll past the hero  
**When** I view the gallery section  
**Then** I see 3-6 before/after image pairs  
**And** images are optimized (WebP, lazy loaded)  
**And** I can swipe/scroll through examples on mobile  
**And** each example loads progressively

---

### Story 2.4: Trust Signals Section

As a **visitor**,  
I want **to feel confident my data is safe**,  
So that **I'm comfortable uploading my ultrasound**.

**Acceptance Criteria:**

**Given** I'm considering uploading  
**When** I view the trust section  
**Then** I see privacy messaging ("Your images are deleted after 30 days")  
**And** I see security badges (HTTPS, encrypted)  
**And** I see a link to privacy policy  
**And** messaging is warm, not legal jargon

---

### Story 2.5: FAQ Accordion

As a **visitor**,  
I want **answers to common questions**,  
So that **I understand how the service works**.

**Acceptance Criteria:**

**Given** I have questions about the service  
**When** I scroll to the FAQ section  
**Then** I see expandable FAQ items  
**And** FAQs cover: how it works, pricing, privacy, quality  
**And** only one FAQ is expanded at a time  
**And** FAQs are keyboard accessible

---

### Story 2.6: SEO Optimization

As a **search engine user**,  
I want **3d-ultra to appear in relevant searches**,  
So that **I can discover it organically**.

**Acceptance Criteria:**

**Given** a user searches "4D ultrasound to photo"  
**When** search engines index the site  
**Then** page has unique title and meta description  
**And** structured data (JSON-LD) is present  
**And** OG image is configured for social sharing  
**And** canonical URLs are set  
**And** robots.txt allows indexing

---

