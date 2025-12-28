---
workflow: create-epics-and-stories
project: babypeek
started: 2024-12-20
completedAt: 2024-12-20
lastStep: 4
stepsCompleted: [1, 2, 3, 4]
status: complete
totalEpics: 8
totalStories: 58
storiesByPriority:
  P0: 19
  P1: 21
  P2: 18
frCoverage: 52/53
inputDocuments:
  - _bmad-output/prd.md
  - _bmad-output/architecture.md
  - _bmad-output/ux-design-specification.md
partyModeReview: 2024-12-20
refinements:
  - Added stories 1.8 (Test Infrastructure) and 1.9 (Effect Services Scaffold)
  - Added story 3.9 (Upload Analytics)
  - Added story 5.7 (Mobile Session Recovery)
  - Added story 8.8 (Expired Result Handling)
  - Refined ACs for stories 1.1-1.6, 3.2, 4.2, 5.2, 5.3, 6.3, 6.6
  - Added parallelization map and priority tiers
  - Added risk register
validation:
  frCoverage: passed
  architectureCompliance: passed
  storyQuality: passed
  epicStructure: passed
  dependencies: passed
---

# babypeek - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for babypeek, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

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

| FR Range        | Epic     | Domain          |
| --------------- | -------- | --------------- |
| FR-1.1 – FR-1.8 | Epic 3   | Upload          |
| FR-2.1 – FR-2.6 | Epic 4   | AI Processing   |
| FR-3.1 – FR-3.6 | Epic 5   | Reveal          |
| FR-4.1 – FR-4.7 | Epic 6   | Payment         |
| FR-5.1 – FR-5.6 | Epic 7   | Download        |
| FR-6.1 – FR-6.6 | Epic 8   | Sharing         |
| FR-7.1 – FR-7.6 | Epic 2   | Landing         |
| FR-8.1          | Epic 7   | Email           |
| FR-8.2 – FR-8.3 | Epic 1   | Observability   |
| FR-8.4          | Epic 3   | Rate Limiting   |
| FR-8.5          | Epic 8   | Auto-delete     |
| FR-8.6          | Deferred | Admin Dashboard |

**Coverage:** 53/54 FRs mapped (FR-8.6 deferred to post-MVP)

## Parallelization Map

```
EPIC 1: Foundation
  1.1 → 1.2 → 1.3 → 1.4 → [1.5 ∥ 1.6 ∥ 1.7 ∥ 1.8 ∥ 1.9]

EPIC 2: Landing (can start after 1.1)
  2.1 → [2.2 ∥ 2.3 ∥ 2.4 ∥ 2.5 ∥ 2.6]

EPIC 3: Upload
  [3.1 ∥ 3.4] → [3.2 ∥ 3.3] → 3.5 → 3.6 → 3.7 → [3.8 ∥ 3.9]

EPIC 4: AI Processing
  4.1 → 4.2 → 4.3 → [4.4 ∥ 4.5] → 4.6

EPIC 5: Reveal
  [5.1 ∥ 5.2] → 5.3 → [5.4 ∥ 5.5 ∥ 5.6 ∥ 5.7]

EPIC 6: Payment
  6.1 → 6.2 → 6.3 → 6.4 → [6.5 ∥ 6.6 ∥ 6.7]

EPIC 7: Download
  7.1 → 7.2 → [7.3 ∥ 7.4] → [7.5 ∥ 7.6]

EPIC 8: Sharing
  [8.1 ∥ 8.2 ∥ 8.3] → 8.4 → 8.5 → [8.6 ∥ 8.7 ∥ 8.8]
```

**Legend:** `→` = sequential dependency, `∥` = can run in parallel, `[...]` = parallel group

## Priority Tiers

### 🔴 P0 - Critical Path (Block release if incomplete)

- 1.1, 1.2, 1.3, 1.4 (Foundation core)
- 3.1, 3.5, 3.6, 3.7 (Upload core)
- 4.1, 4.2, 4.4 (AI core)
- 5.2, 5.3 (Reveal core)
- 6.1, 6.3, 6.4 (Payment core)
- 7.1, 7.2, 7.3 (Download core)

### 🟡 P1 - Important (Complete in sprint)

- 1.5, 1.6, 1.7 (Observability)
- 2.1, 2.2 (Landing essentials)
- 3.2, 3.3, 3.4, 3.9 (Upload polish)
- 4.3, 4.5, 4.6 (AI reliability)
- 5.1, 5.6 (Reveal experience)
- 6.2, 6.5, 6.6 (Payment UX)
- 7.4, 7.5 (Delivery)
- 8.1, 8.3, 8.4, 8.5 (Sharing core)

### 🟢 P2 - Enhancement (Can defer if needed)

- 1.8, 1.9 (Test infrastructure, schema docs)
- 2.3, 2.4, 2.5, 2.6 (Landing extras)
- 3.8 (Rate limiting)
- 5.4, 5.5, 5.7 (Accessibility, comparison, session recovery)
- 6.7 (Gift purchase)
- 7.6 (Download tracking)
- 8.2, 8.6, 8.7, 8.8 (iMessage, GDPR, auto-delete, expired handling)

## Risk Register

| Rank | Risk                                  | Stories  | Impact   | Mitigation                                        |
| ---- | ------------------------------------- | -------- | -------- | ------------------------------------------------- |
| 1    | Gemini API quality/stability          | 4.2, 4.3 | CRITICAL | Quality validation gate, fallback messaging       |
| 2    | Mobile performance (HEIC + animation) | 3.2, 5.3 | HIGH     | Lazy loading, performance budgets, device testing |
| 3    | Payment webhook reliability           | 6.3      | HIGH     | Idempotency, retry logic, reconciliation          |
| 4    | 90s processing timeout                | 4.6      | MEDIUM   | User expectations, graceful degradation           |
| 5    | Session loss on mobile                | 5.7      | MEDIUM   | localStorage persistence, visibility API          |

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

**User Outcome:** Users discover babypeek and understand its value proposition

**Goal:** A visitor lands on the page, instantly understands what babypeek does, sees compelling before/after examples, and is motivated to try it.

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

**Priority:** 🔴 P0 | **Parallel:** None (must be first)

As a **developer**,  
I want **the project initialized with Better-T-Stack, Hono, and Effect**,  
So that **I have a working monorepo ready for feature development**.

**Acceptance Criteria:**

**Given** a fresh workspace  
**When** I run the initialization commands  
**Then** the project has `apps/web` (TanStack Start) and `packages/api` (Hono)  
**And** Effect 3.x is installed with `@effect/schema`  
**And** `bun run dev` starts both frontend and backend  
**And** TypeScript strict mode is enabled  
**And** initial bundle size is under 150KB (NFR-1.6)  
**And** Effect Services pattern scaffold exists in `packages/api/src/services/`

---

### Story 1.2: Configure Neon PostgreSQL Connection

**Priority:** 🔴 P0 | **Parallel:** None (after 1.1)

As a **developer**,  
I want **Neon PostgreSQL connected via Drizzle ORM**,  
So that **I can store and query data in the database**.

**Acceptance Criteria:**

**Given** Neon database credentials in environment  
**When** I run the application  
**Then** Drizzle connects to Neon without errors  
**And** `bun run db:push` syncs schema changes  
**And** `bun run db:studio` opens Drizzle Studio  
**And** connection pooling is configured via `@neondatabase/serverless`  
**And** `uploads` table is created with: id, email, sessionToken, originalUrl, status, stage, progress, createdAt  
**And** `results` table is created with: id, uploadId, resultUrl, previewUrl, createdAt  
**And** `purchases` table is created with: id, resultId, email, stripeSessionId, amount, type, createdAt

---

### Story 1.3: Configure Cloudflare R2 Storage

**Priority:** 🔴 P0 | **Parallel:** None (after 1.2)

As a **developer**,  
I want **Cloudflare R2 configured with presigned URL support**,  
So that **I can upload and retrieve files securely**.

**Acceptance Criteria:**

**Given** R2 credentials in environment  
**When** I call the R2 service  
**Then** I can generate presigned upload URLs (15 min expiry)  
**And** I can generate presigned download URLs (configurable expiry)  
**And** URLs use non-guessable IDs (cuid2 or similar)  
**And** CORS is configured for the web domain  
**And** R2Service is implemented as Effect Service with typed errors

---

### Story 1.4: Set Up Environment Configuration

**Priority:** 🔴 P0 | **Parallel:** None (after 1.3)

As a **developer**,  
I want **Zod-validated environment variables**,  
So that **the app fails fast on missing or invalid config**.

**Acceptance Criteria:**

**Given** an `.env.example` file with all required variables  
**When** the application starts  
**Then** all environment variables are validated with Zod  
**And** missing required variables throw descriptive errors  
**And** sensitive values are never logged  
**And** type-safe `env` object is exported from `packages/api/src/lib/env.ts`  
**And** validation covers: DATABASE*URL, R2*_, GEMINI*API_KEY, STRIPE*_, RESEND_API_KEY

---

### Story 1.5: Integrate PostHog Analytics

**Priority:** 🟡 P1 | **Parallel:** [1.5 ∥ 1.6 ∥ 1.7 ∥ 1.8 ∥ 1.9]

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
**And** funnel events defined: upload_started, upload_completed, processing_completed, reveal_viewed, purchase_completed, share_clicked

---

### Story 1.6: Integrate Sentry Error Tracking

**Priority:** 🟡 P1 | **Parallel:** [1.5 ∥ 1.6 ∥ 1.7 ∥ 1.8 ∥ 1.9]

As a **developer**,  
I want **Sentry integrated for error tracking**,  
So that **I'm alerted to production errors immediately**.

**Acceptance Criteria:**

**Given** Sentry DSN in environment  
**When** an unhandled error occurs  
**Then** the error is reported to Sentry with stack trace  
**And** source maps are uploaded for readable traces  
**And** user context (session token only, no PII) is attached (NFR-2.6)  
**And** breadcrumbs show recent actions  
**And** email addresses are never logged or sent to Sentry  
**And** Sentry is configured for both frontend and backend

---

### Story 1.7: Configure CI/CD Pipeline

**Priority:** 🟡 P1 | **Parallel:** [1.5 ∥ 1.6 ∥ 1.7 ∥ 1.8 ∥ 1.9]

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
**And** type checking runs on every PR  
**And** linting runs on every PR

---

### Story 1.8: Test Infrastructure Setup

**Priority:** 🟢 P2 | **Parallel:** [1.5 ∥ 1.6 ∥ 1.7 ∥ 1.8 ∥ 1.9]

As a **developer**,  
I want **test infrastructure configured for unit and E2E tests**,  
So that **I can write and run tests with confidence**.

**Acceptance Criteria:**

**Given** the project is initialized  
**When** I run the test commands  
**Then** Vitest is configured for unit tests  
**And** Playwright is configured for E2E tests  
**And** `bun run test` runs all unit tests  
**And** `bun run test:e2e` runs E2E tests  
**And** tests run in CI pipeline on every PR  
**And** coverage reporting is configured

---

### Story 1.9: Effect Services Scaffold

**Priority:** 🟢 P2 | **Parallel:** [1.5 ∥ 1.6 ∥ 1.7 ∥ 1.8 ∥ 1.9]

As a **developer**,  
I want **Effect Services pattern scaffolded for all core services**,  
So that **I have a consistent architecture to build on**.

**Acceptance Criteria:**

**Given** Effect is installed  
**When** I review the services folder  
**Then** service scaffold exists for: GeminiService, R2Service, StripeService, ResendService, UploadService, ResultService  
**And** typed errors are defined in `packages/api/src/lib/errors.ts`  
**And** `AppServicesLive` layer exports all services  
**And** example service implementation demonstrates the pattern

---

## Epic 2: Landing Experience — Stories

### Story 2.1: Mobile-Optimized Landing Layout

**Priority:** 🟡 P1 | **Parallel:** None (first in Epic 2)

As a **visitor**,  
I want **a mobile-first landing page that loads fast**,  
So that **I can easily browse on my phone**.

**Acceptance Criteria:**

**Given** I visit babypeek.com on mobile  
**When** the page loads  
**Then** LCP is under 2.5s (NFR-1.1)  
**And** TTI is under 3.5s (NFR-1.2)  
**And** layout is single-column with no horizontal scroll  
**And** touch targets are at least 48px (NFR-5.5)  
**And** bottom CTA button is thumb-reachable  
**And** skip link exists for keyboard users

---

### Story 2.2: Hero Section with Value Proposition

**Priority:** 🟡 P1 | **Parallel:** [2.2 ∥ 2.3 ∥ 2.4 ∥ 2.5 ∥ 2.6]

As a **visitor**,  
I want **to immediately understand what babypeek does**,  
So that **I decide whether to try it**.

**Acceptance Criteria:**

**Given** I land on the homepage  
**When** I view the hero section  
**Then** I see a compelling headline ("Meet your baby before they're born")  
**And** I see a single before/after example image  
**And** I see a clear CTA button ("Try it free")  
**And** the CTA scrolls to upload section or navigates to upload page  
**And** hero uses Playfair Display font for headline  
**And** hero uses coral primary color (#E8927C)

---

### Story 2.3: Before/After Example Gallery

**Priority:** 🟢 P2 | **Parallel:** [2.2 ∥ 2.3 ∥ 2.4 ∥ 2.5 ∥ 2.6]

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
**And** images have descriptive alt text for screen readers

---

### Story 2.4: Trust Signals Section

**Priority:** 🟢 P2 | **Parallel:** [2.2 ∥ 2.3 ∥ 2.4 ∥ 2.5 ∥ 2.6]

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

**Priority:** 🟢 P2 | **Parallel:** [2.2 ∥ 2.3 ∥ 2.4 ∥ 2.5 ∥ 2.6]

As a **visitor**,  
I want **answers to common questions**,  
So that **I understand how the service works**.

**Acceptance Criteria:**

**Given** I have questions about the service  
**When** I scroll to the FAQ section  
**Then** I see expandable FAQ items  
**And** FAQs cover: how it works, pricing, privacy, quality  
**And** only one FAQ is expanded at a time  
**And** FAQs are keyboard accessible (Enter/Space to toggle)  
**And** FAQs use proper ARIA attributes (aria-expanded, aria-controls)

---

### Story 2.6: SEO Optimization

**Priority:** 🟢 P2 | **Parallel:** [2.2 ∥ 2.3 ∥ 2.4 ∥ 2.5 ∥ 2.6]

As a **search engine user**,  
I want **babypeek to appear in relevant searches**,  
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

## Epic 3: Image Upload — Stories

### Story 3.1: Image Picker with Format Validation

**Priority:** 🔴 P0 | **Parallel:** [3.1 ∥ 3.4]

As a **user**,  
I want **to select an ultrasound image from my camera roll**,  
So that **I can begin the transformation process**.

**Acceptance Criteria:**

**Given** I tap the upload button  
**When** I select an image file  
**Then** the system accepts JPEG, PNG, and HEIC formats (FR-1.1)  
**And** files larger than 25MB are rejected with a clear error (FR-1.2)  
**And** non-image files are rejected with a clear error  
**And** the upload zone has a 48px minimum touch target  
**And** the upload zone pulses on drag-over

---

### Story 3.2: Client-Side HEIC Conversion

**Priority:** 🟡 P1 | **Parallel:** [3.2 ∥ 3.3]

As a **user**,  
I want **my iPhone HEIC images converted automatically**,  
So that **I don't need to worry about file formats**.

**Acceptance Criteria:**

**Given** I select a HEIC image  
**When** the upload process begins  
**Then** the image is converted to JPEG client-side using heic2any (FR-1.3)  
**And** heic2any is lazy-loaded to avoid bundle bloat  
**And** the conversion happens before upload starts  
**And** the user sees a "Preparing image..." indicator during conversion  
**And** files >15MB show a warning about potential memory issues

---

### Story 3.3: Client-Side Image Compression

**Priority:** 🟡 P1 | **Parallel:** [3.2 ∥ 3.3]

As a **user**,  
I want **large images compressed automatically**,  
So that **uploads are faster and don't fail**.

**Acceptance Criteria:**

**Given** I select an image larger than 2MB  
**When** the upload process begins  
**Then** the image is compressed to under 2MB using browser-image-compression (FR-1.4)  
**And** max dimension is capped at 2048px  
**And** the user sees compression progress if it takes >500ms  
**And** compression uses Web Workers for performance

---

### Story 3.4: Email Capture

**Priority:** 🟡 P1 | **Parallel:** [3.1 ∥ 3.4]

As a **user**,  
I want **to enter my email address**,  
So that **I receive my result and can access it later**.

**Acceptance Criteria:**

**Given** I have selected an image  
**When** I enter my email  
**Then** the email is validated on blur (proper format)  
**And** invalid emails show a clear error message  
**And** the email input has proper keyboard type on mobile (type="email")  
**And** the input has aria-describedby for error messages

---

### Story 3.5: Presigned URL Generation and R2 Upload

**Priority:** 🔴 P0 | **Parallel:** None (after 3.2, 3.3)

As a **user**,  
I want **my image uploaded securely to the cloud**,  
So that **it can be processed by the AI**.

**Acceptance Criteria:**

**Given** I have a valid image and email  
**When** I tap "Start"  
**Then** the server generates a presigned upload URL for R2 (FR-1.8)  
**And** the image is uploaded directly to R2  
**And** upload progress is shown as percentage (FR-1.6)  
**And** upload can be cancelled by the user  
**And** upload latency is under 500ms to start (NFR-1.3)

---

### Story 3.6: Session Token and Job Creation

**Priority:** 🔴 P0 | **Parallel:** None (after 3.5)

As a **user**,  
I want **my upload to create a job for processing**,  
So that **I can track the progress of my transformation**.

**Acceptance Criteria:**

**Given** my image is uploaded to R2  
**When** the upload completes  
**Then** a database record is created with status "pending"  
**And** a jobId is returned to the frontend  
**And** a sessionToken is generated and stored as `babypeek-session-{jobId}` in localStorage  
**And** I'm navigated to the processing screen with the jobId  
**And** upload_completed event is sent to PostHog

---

### Story 3.7: Rate Limiting

**Priority:** 🔴 P0 | **Parallel:** None (after 3.6)

As a **system operator**,  
I want **upload rate limiting enforced**,  
So that **abuse is prevented and costs are controlled**.

**Acceptance Criteria:**

**Given** an IP address has uploaded 10 images in the past hour  
**When** they attempt another upload  
**Then** the request is rejected with a 429 status (FR-8.4)  
**And** the error message says "You've reached the upload limit. Please try again later."  
**And** rate limiting is applied at Vercel edge middleware  
**And** rate limiting is also applied at Hono app level (dual layer)

---

### Story 3.8: Upload Error Handling

**Priority:** 🟢 P2 | **Parallel:** [3.8 ∥ 3.9]

As a **user**,  
I want **clear feedback if my upload fails**,  
So that **I can try again without frustration**.

**Acceptance Criteria:**

**Given** my upload is in progress  
**When** the network fails or upload is interrupted (FR-1.7)  
**Then** I see a warm error message ("Oops! Let's try that again")  
**And** a retry button is displayed  
**And** the error is logged to Sentry (without PII)  
**And** partial uploads are cleaned up from R2

---

### Story 3.9: Upload Analytics

**Priority:** 🟢 P2 | **Parallel:** [3.8 ∥ 3.9]

As a **product owner**,  
I want **upload funnel metrics tracked**,  
So that **I can measure conversion and identify drop-offs**.

**Acceptance Criteria:**

**Given** a user interacts with upload  
**When** key events occur  
**Then** upload_started event fires with file_type, file_size  
**And** upload_completed event fires with duration  
**And** upload_failed event fires with error_type  
**And** events are sent to PostHog

---

## Epic 4: AI Processing — Stories

### Story 4.1: Workflow Job Definition

**Priority:** 🔴 P0 | **Parallel:** None (first in Epic 4)

As a **developer**,  
I want **a durable workflow defined for image processing**,  
So that **long-running AI jobs survive function timeouts**.

**Acceptance Criteria:**

**Given** an upload with status "pending"  
**When** the process endpoint is called  
**Then** a Workflow job is created (useworkflow.dev)  
**And** the job ID is stored in the database  
**And** the upload status changes to "processing"  
**And** the endpoint returns immediately (<2s fire-and-forget pattern)

---

### Story 4.2: Gemini Imagen 3 Integration

**Priority:** 🔴 P0 | **Parallel:** None (after 4.1)

As a **system**,  
I want **to call Gemini Imagen 3 API with the ultrasound**,  
So that **a photorealistic baby portrait is generated**.

**Acceptance Criteria:**

**Given** a workflow job is running  
**When** the Gemini API is called (FR-2.1)  
**Then** the original image URL is passed to the API  
**And** a structured prompt template is used (FR-2.2)  
**And** the prompt template is documented in `/packages/api/src/prompts/`  
**And** the generated image is returned as a blob  
**And** the call is wrapped in Effect.tryPromise with GeminiError typed error  
**And** API call has 60 second timeout

---

### Story 4.3: Retry Logic with Exponential Backoff

**Priority:** 🟡 P1 | **Parallel:** None (after 4.2)

As a **system**,  
I want **transient failures to be retried automatically**,  
So that **temporary API issues don't cause user failures**.

**Acceptance Criteria:**

**Given** a Gemini API call fails with a transient error  
**When** the retry logic activates (FR-2.4)  
**Then** the call is retried up to 3 times  
**And** backoff is exponential (1s, 2s, 4s) using Effect.retry with Schedule  
**And** non-transient errors (invalid image, content policy) fail immediately  
**And** all retries are logged to Sentry

---

### Story 4.4: Result Storage in R2

**Priority:** 🔴 P0 | **Parallel:** [4.4 ∥ 4.5]

As a **system**,  
I want **generated images stored securely in R2**,  
So that **they can be retrieved for reveal and download**.

**Acceptance Criteria:**

**Given** Gemini returns a generated image  
**When** the image is processed (FR-2.6)  
**Then** the full-resolution image is stored at `/results/{resultId}/full.jpg`  
**And** a result record is created in the database  
**And** the result is linked to the upload record  
**And** storage uses Effect R2Service with typed errors

---

### Story 4.5: Processing Status Updates

**Priority:** 🟡 P1 | **Parallel:** [4.4 ∥ 4.5]

As a **user**,  
I want **to see real-time progress of my image processing**,  
So that **I know something is happening during the wait**.

**Acceptance Criteria:**

**Given** my image is being processed  
**When** I poll GET /api/status/:jobId  
**Then** I receive the current stage (validating, generating, watermarking, complete)  
**And** I receive progress percentage (0-100)  
**And** the response includes resultId when complete  
**And** status updates are stored in the database (stage, progress columns)  
**And** polling interval is 2-3 seconds

---

### Story 4.6: Processing Timeout Handling

**Priority:** 🟡 P1 | **Parallel:** None (after 4.4, 4.5)

As a **user**,  
I want **to be notified if processing takes too long**,  
So that **I'm not left waiting indefinitely**.

**Acceptance Criteria:**

**Given** processing has been running for >90 seconds (FR-2.3)  
**When** the timeout is reached  
**Then** the job is marked as "failed" in the database  
**And** the user sees a warm error ("This is taking longer than expected. Let's try again!")  
**And** a retry option is offered  
**And** the timeout is logged to Sentry with job context  
**And** Effect.timeout is used for the 90s limit

---

## Epic 5: Reveal Experience — Stories

### Story 5.1: Processing Status Page

**Priority:** 🟡 P1 | **Parallel:** [5.1 ∥ 5.2]

As a **user**,  
I want **to see engaging content while waiting**,  
So that **the 60-90 second wait feels shorter**.

**Acceptance Criteria:**

**Given** I'm on the processing page  
**When** I'm waiting for my result  
**Then** I see a 3-stage progress indicator (Analyzing, Creating, Finishing)  
**And** the current stage is highlighted with animation  
**And** copy changes per stage ("Analyzing your ultrasound...", "Creating your baby's portrait...", "Adding final touches...")  
**And** baby facts rotate every 10 seconds  
**And** skeleton loading is shown for the image area  
**And** aria-live region announces stage changes for screen readers

---

### Story 5.2: Watermark Application

**Priority:** 🔴 P0 | **Parallel:** [5.1 ∥ 5.2]

As a **system**,  
I want **a watermarked preview generated from the result**,  
So that **users can share without giving away the full image**.

**Acceptance Criteria:**

**Given** the AI-generated image is stored  
**When** the watermarking stage runs (FR-3.1)  
**Then** a watermark is applied at 40% opacity (FR-3.2)  
**And** the watermark is positioned in bottom-right corner  
**And** the watermark is 15% of image width  
**And** the watermark text is "babypeek.com"  
**And** the preview is resized to 800px max dimension (FR-3.3)  
**And** the preview is stored at `/results/{resultId}/preview.jpg`  
**And** watermarking uses Sharp library

---

### Story 5.3: Blur-to-Sharp Reveal Animation

**Priority:** 🔴 P0 | **Parallel:** None (after 5.1, 5.2)

As a **user**,  
I want **a dramatic reveal of my baby's portrait**,  
So that **the moment feels magical and emotional**.

**Acceptance Criteria:**

**Given** processing is complete  
**When** the reveal begins (FR-3.4)  
**Then** the image starts with blur(20px) and opacity 0.7  
**And** blur clears to 0 over 2 seconds with easeOutCubic  
**And** subtle zoom settles from 1.05 to 1.0 over 2.5 seconds  
**And** UI buttons appear after 3.5 second delay  
**And** animation runs at 60fps (NFR-1.5)  
**And** image is preloaded during processing to avoid delay  
**And** animation uses CSS transforms for GPU acceleration

---

### Story 5.4: Reduced Motion Support

**Priority:** 🟢 P2 | **Parallel:** [5.4 ∥ 5.5 ∥ 5.6 ∥ 5.7]

As a **user with motion sensitivity**,  
I want **the reveal to respect my accessibility settings**,  
So that **I can still enjoy the product safely**.

**Acceptance Criteria:**

**Given** my device has prefers-reduced-motion enabled  
**When** the reveal happens  
**Then** the image appears immediately without blur animation  
**And** all transitions are reduced to 0.01ms  
**And** the experience is still emotionally satisfying (fade in allowed)  
**And** UI buttons appear immediately

---

### Story 5.5: Before/After Comparison Slider

**Priority:** 🟢 P2 | **Parallel:** [5.4 ∥ 5.5 ∥ 5.6 ∥ 5.7]

As a **user**,  
I want **to compare my ultrasound with the result**,  
So that **I can appreciate the transformation**.

**Acceptance Criteria:**

**Given** I'm viewing my result  
**When** I interact with the comparison slider (FR-3.5)  
**Then** I can drag left/right to reveal original vs result  
**And** the slider handle is touch-friendly (48px minimum)  
**And** keyboard users can control with arrow keys  
**And** both images are the same dimensions

---

### Story 5.6: Download Preview Button

**Priority:** 🟡 P1 | **Parallel:** [5.4 ∥ 5.5 ∥ 5.6 ∥ 5.7]

As a **user**,  
I want **to download the watermarked preview**,  
So that **I can share it even without purchasing**.

**Acceptance Criteria:**

**Given** I'm viewing my result  
**When** I tap "Download Preview" (FR-3.6)  
**Then** the watermarked image downloads to my device  
**And** the filename is "babypeek-preview-{date}.jpg"  
**And** the download is tracked in PostHog

---

### Story 5.7: Mobile Session Recovery

**Priority:** 🟢 P2 | **Parallel:** [5.4 ∥ 5.5 ∥ 5.6 ∥ 5.7]

As a **mobile user**,  
I want **my session to recover if I background the app**,  
So that **I don't lose my progress during the 90-second wait**.

**Acceptance Criteria:**

**Given** I'm on the processing page and I background the app  
**When** I return to the app  
**Then** the app detects visibility change and re-fetches status  
**And** if processing completed, I'm shown the reveal  
**And** if still processing, I see updated progress  
**And** current jobId is persisted in localStorage  
**And** on app load, saved jobId is checked and resumed if incomplete

---

## Epic 6: Payment — Stories

### Story 6.1: Stripe Checkout Integration

**Priority:** 🔴 P0 | **Parallel:** None (first in Epic 6)

As a **user**,  
I want **to purchase the HD version via Stripe**,  
So that **I can get the full-resolution image**.

**Acceptance Criteria:**

**Given** I'm viewing my result  
**When** I tap "Get HD Version" (FR-4.1)  
**Then** a Stripe Checkout session is created  
**And** the session includes resultId, email, and type in metadata  
**And** I'm redirected to Stripe Checkout  
**And** price is displayed clearly ($9.99) (FR-4.4)  
**And** purchase_started event is sent to PostHog

---

### Story 6.2: Apple Pay and Google Pay Support

**Priority:** 🟡 P1 | **Parallel:** None (after 6.1)

As a **user**,  
I want **to pay with Apple Pay or Google Pay**,  
So that **I can complete payment in two taps**.

**Acceptance Criteria:**

**Given** I'm on Stripe Checkout  
**When** Apple Pay or Google Pay is available on my device (FR-4.2, FR-4.3)  
**Then** the express payment button is shown prominently  
**And** I can complete payment with biometric auth  
**And** payment completes without typing card details

---

### Story 6.3: Stripe Webhook Handler

**Priority:** 🔴 P0 | **Parallel:** None (after 6.2)

As a **system**,  
I want **payment completions processed via webhook**,  
So that **purchases are recorded reliably**.

**Acceptance Criteria:**

**Given** a Stripe checkout.session.completed event  
**When** the webhook is received at POST /api/webhook/stripe  
**Then** the signature is verified using STRIPE_WEBHOOK_SECRET  
**And** duplicate events are handled idempotently (check stripeSessionId exists)  
**And** the event is acknowledged with 200 status  
**And** webhook errors are logged to Sentry

---

### Story 6.4: Purchase Record Creation

**Priority:** 🔴 P0 | **Parallel:** None (after 6.3)

As a **system**,  
I want **purchase records stored in the database**,  
So that **I can verify access and track revenue**.

**Acceptance Criteria:**

**Given** a successful payment  
**When** the purchase is recorded  
**Then** the record includes resultId, email, stripeSessionId, amount, type  
**And** type is "self" for regular purchases  
**And** type is "gift" for gift purchases  
**And** purchase_completed event is sent to PostHog with amount

---

### Story 6.5: Payment Receipt Email

**Priority:** 🟡 P1 | **Parallel:** [6.5 ∥ 6.6 ∥ 6.7]

As a **user**,  
I want **a receipt emailed after purchase**,  
So that **I have proof of payment**.

**Acceptance Criteria:**

**Given** my payment is successful  
**When** the purchase is recorded (FR-4.6)  
**Then** an email is sent via Resend  
**And** the email includes purchase amount and date  
**And** the email includes a link to download the HD image  
**And** the email is warm and congratulatory in tone  
**And** email delivery is tracked (>95% target per NFR-4.4)

---

### Story 6.6: Payment Failure Handling

**Priority:** 🟡 P1 | **Parallel:** [6.5 ∥ 6.6 ∥ 6.7]

As a **user**,  
I want **clear feedback if my payment fails**,  
So that **I can resolve the issue and try again**.

**Acceptance Criteria:**

**Given** I'm attempting payment  
**When** the payment fails (declined, insufficient funds, etc.) (FR-4.7)  
**Then** I see a warm error message ("Payment didn't go through. Let's try again!")  
**And** I can retry with the same or different payment method  
**And** card entry fallback is available if express pay fails  
**And** the failure is logged to Sentry (without sensitive card data)  
**And** payment_failed event is sent to PostHog with error_type

---

### Story 6.7: Gift Purchase Option

**Priority:** 🟢 P2 | **Parallel:** [6.5 ∥ 6.6 ∥ 6.7]

As a **gift buyer**,  
I want **to purchase the HD image as a gift for someone else**,  
So that **I can surprise the expecting parent**.

**Acceptance Criteria:**

**Given** I'm viewing a shared result (FR-4.5)  
**When** I tap "Gift This Photo"  
**Then** the Stripe session is created with type="gift" in metadata  
**And** I enter my email for receipt  
**And** the original uploader receives the HD download link via email  
**And** I receive a confirmation email  
**And** the gift CTA explains "The HD photo will be sent to the parent"

---

## Epic 7: Download & Delivery — Stories

### Story 7.1: HD Image Retrieval

**Priority:** 🔴 P0 | **Parallel:** None (first in Epic 7)

As a **user**,  
I want **access to my full-resolution image after purchase**,  
So that **I have a high-quality photo to keep**.

**Acceptance Criteria:**

**Given** I have purchased the HD version (FR-5.1)  
**When** I access the download page  
**Then** the full-resolution image is available  
**And** the image is not watermarked  
**And** the image is the maximum quality from AI generation  
**And** access is verified via sessionToken + purchase record

---

### Story 7.2: Signed Download URL Generation

**Priority:** 🔴 P0 | **Parallel:** None (after 7.1)

As a **user**,  
I want **secure download links that expire**,  
So that **my purchase is protected from unauthorized access**.

**Acceptance Criteria:**

**Given** I have a valid purchase  
**When** I request a download (FR-5.2)  
**Then** a signed URL is generated with 7-day expiration (FR-5.3)  
**And** URLs use non-guessable IDs (cuid2)  
**And** unauthorized access to the URL returns 403  
**And** signed URLs are generated via R2Service

---

### Story 7.3: In-App Download Button

**Priority:** 🔴 P0 | **Parallel:** [7.3 ∥ 7.4]

As a **user**,  
I want **to download my HD image directly from the app**,  
So that **I can save it to my camera roll immediately**.

**Acceptance Criteria:**

**Given** I'm on the download page after purchase (FR-5.5)  
**When** I tap "Download HD"  
**Then** the image downloads to my device  
**And** I see download progress if file is large  
**And** the filename is "babypeek-baby-{date}.jpg"  
**And** success confirmation is shown  
**And** download_clicked event is sent to PostHog

---

### Story 7.4: Download Email via Resend

**Priority:** 🟡 P1 | **Parallel:** [7.3 ∥ 7.4]

As a **user**,  
I want **my download link emailed to me**,  
So that **I can access it later from any device**.

**Acceptance Criteria:**

**Given** my purchase is complete (FR-5.4)  
**When** the purchase is processed  
**Then** an email is sent via Resend with download link (FR-8.1)  
**And** the email is warm and celebratory  
**And** the download link is clearly visible and prominent  
**And** email includes 7-day expiration notice

---

### Story 7.5: Re-Download Support

**Priority:** 🟡 P1 | **Parallel:** [7.5 ∥ 7.6]

As a **user**,  
I want **to re-download my image within 30 days**,  
So that **I can recover it if I lose the file**.

**Acceptance Criteria:**

**Given** I purchased within the last 30 days (FR-5.6)  
**When** I return to my result page with my session token  
**Then** I can generate a new download link  
**And** the download button is available  
**And** after 30 days, the option shows "Download expired"

---

### Story 7.6: Download Tracking

**Priority:** 🟢 P2 | **Parallel:** [7.5 ∥ 7.6]

As a **system operator**,  
I want **downloads tracked for analytics**,  
So that **I understand user behavior post-purchase**.

**Acceptance Criteria:**

**Given** a user clicks download  
**When** the download starts  
**Then** a download_clicked event is sent to PostHog  
**And** the event includes resultId, purchase type, and is_redownload flag  
**And** download count is stored per result in database

---

## Epic 8: Sharing & Viral Loop — Stories

### Story 8.1: WhatsApp Share Button

**Priority:** 🟡 P1 | **Parallel:** [8.1 ∥ 8.2 ∥ 8.3]

As a **user**,  
I want **to share my result directly to WhatsApp**,  
So that **my family can see it instantly**.

**Acceptance Criteria:**

**Given** I'm viewing my result  
**When** I tap the WhatsApp share button (FR-6.1)  
**Then** WhatsApp opens with a pre-filled message  
**And** the message includes the share link (babypeek.com/share/{shareId})  
**And** share_clicked event is sent to PostHog with platform="whatsapp"

---

### Story 8.2: iMessage Share Button

**Priority:** 🟢 P2 | **Parallel:** [8.1 ∥ 8.2 ∥ 8.3]

As a **user**,  
I want **to share my result via iMessage**,  
So that **I can reach family who use iPhones**.

**Acceptance Criteria:**

**Given** I'm viewing my result on iOS  
**When** I tap the iMessage share button (FR-6.2)  
**Then** Messages opens with a pre-filled message  
**And** the message includes the share link  
**And** share_clicked event is sent to PostHog with platform="imessage"

---

### Story 8.3: Copy Link Button

**Priority:** 🟡 P1 | **Parallel:** [8.1 ∥ 8.2 ∥ 8.3]

As a **user**,  
I want **to copy the share link to my clipboard**,  
So that **I can paste it anywhere**.

**Acceptance Criteria:**

**Given** I'm viewing my result  
**When** I tap "Copy Link" (FR-6.3)  
**Then** the share URL is copied to clipboard  
**And** I see confirmation toast ("Link copied!")  
**And** the link format is `babypeek.com/share/{shareId}`  
**And** share_clicked event is sent to PostHog with platform="copy"

---

### Story 8.4: Share Page with Watermarked Preview

**Priority:** 🟡 P1 | **Parallel:** None (after 8.1-8.3)

As a **share recipient**,  
I want **to view the shared result**,  
So that **I can see the baby photo**.

**Acceptance Criteria:**

**Given** I receive a share link  
**When** I open the link (FR-6.5)  
**Then** I see the watermarked preview image  
**And** I see contextual messaging ("See what AI created from an ultrasound!")  
**And** the page is mobile-optimized  
**And** OG meta tags are set for rich link previews in WhatsApp/iMessage

---

### Story 8.5: Gift Purchase CTA on Share Page

**Priority:** 🟡 P1 | **Parallel:** None (after 8.4)

As a **share recipient**,  
I want **to buy the HD version as a gift**,  
So that **I can surprise the expecting parent**.

**Acceptance Criteria:**

**Given** I'm viewing a shared result (FR-6.6)  
**When** I see the gift CTA  
**Then** "Gift This Photo" button is prominently displayed  
**And** tapping it initiates the gift purchase flow (Epic 6, Story 6.7)  
**And** the CTA explains "The HD photo will be sent to the parent"

---

### Story 8.6: Delete My Data Button (GDPR)

**Priority:** 🟢 P2 | **Parallel:** [8.6 ∥ 8.7 ∥ 8.8]

As a **user**,  
I want **to delete all my data**,  
So that **I have control over my personal information**.

**Acceptance Criteria:**

**Given** I'm viewing my result  
**When** I tap "Delete My Data"  
**Then** I see a confirmation dialog  
**And** confirming calls DELETE /api/data/:token  
**And** deletion removes: upload record, result images from R2, email hash  
**And** the deletion is logged for compliance audit  
**And** I see confirmation "Your data has been deleted"  
**And** I'm redirected to the homepage

---

### Story 8.7: Auto-Delete After 30 Days

**Priority:** 🟢 P2 | **Parallel:** [8.6 ∥ 8.7 ∥ 8.8]

As a **system operator**,  
I want **images automatically deleted after 30 days**,  
So that **storage costs are controlled and privacy is maintained**.

**Acceptance Criteria:**

**Given** an upload is older than 30 days (FR-8.5)  
**When** the cleanup job runs (daily cron)  
**Then** original and result images are deleted from R2  
**And** database records are anonymized (email hashed) or deleted  
**And** the deletion is logged  
**And** purchased images follow same policy (30 days post-purchase)

---

### Story 8.8: Expired Result Handling

**Priority:** 🟢 P2 | **Parallel:** [8.6 ∥ 8.7 ∥ 8.8]

As a **user**,  
I want **a clear message if my result has expired**,  
So that **I understand why I can't access it**.

**Acceptance Criteria:**

**Given** my result was deleted after 30 days  
**When** I try to access the result page or share link  
**Then** I see a warm message ("This photo has expired after 30 days")  
**And** I see a CTA to create a new photo  
**And** the page doesn't show a broken image or error

---

## Story Summary

| Epic                  | Stories | P0     | P1     | P2     |
| --------------------- | ------- | ------ | ------ | ------ |
| Epic 1: Foundation    | 9       | 4      | 3      | 2      |
| Epic 2: Landing       | 6       | 0      | 2      | 4      |
| Epic 3: Upload        | 9       | 4      | 3      | 2      |
| Epic 4: AI Processing | 6       | 3      | 3      | 0      |
| Epic 5: Reveal        | 7       | 2      | 2      | 3      |
| Epic 6: Payment       | 7       | 3      | 2      | 2      |
| Epic 7: Download      | 6       | 3      | 2      | 1      |
| Epic 8: Sharing       | 8       | 0      | 4      | 4      |
| **Total**             | **58**  | **19** | **21** | **18** |

---
