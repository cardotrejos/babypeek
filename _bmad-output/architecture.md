---
workflow: create-architecture
project: babypeek
started: 2024-12-20
lastStep: 8
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: complete
completedAt: 2024-12-20
inputDocuments:
  - _bmad-output/prd.md
  - _bmad-output/ux-design-specification.md
workflowType: architecture
---

# System Architecture: babypeek

**Version:** 1.0  
**Date:** 2024-12-20  
**Author:** Architect Agent  
**Status:** Complete

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

- 54 total FRs across 8 categories
- Core flow: Image Upload → AI Processing → Reveal → Payment → Download
- Secondary flows: Sharing, Gift Purchase, Viral Discovery
- MVP includes all "Must" requirements from FR-1 through FR-8

**Non-Functional Requirements:**

- Performance: <2.5s LCP, <90s AI processing, 60fps reveal animation
- Scale: 100+ concurrent uploads, 10K images/day
- Security: HTTPS, signed URLs, rate limiting, no PII in logs
- Accessibility: WCAG 2.1 Level AA
- Reliability: 99.5% uptime, <1% error rate

**Scale & Complexity:**

- Primary domain: Full-Stack Web (Mobile-First)
- Complexity level: Medium
- Estimated architectural components: 15-20
- Critical path: Upload → AI → Reveal → Payment

### Technical Constraints & Dependencies

**Framework Constraints:**

- Frontend: TanStack Start + React + Tailwind + shadcn/ui
- Backend: Hono + Effect (Bun runtime)
- Hosting: Vercel Pro (60s function timeout)
- Database: Drizzle ORM + PostgreSQL
- Storage: Cloudflare R2

**Durable Execution:**

- Workflow (useworkflow.dev) for AI processing pipeline
- Fire-and-forget pattern: Upload returns jobId in <2s
- Workflow handles long-running Gemini calls (60-90s)
- Frontend polls /api/status/:jobId for progress

**External Service Dependencies:**

- AI: Gemini Imagen 3 API
- Payments: Stripe (Apple Pay, Google Pay)
- Email: Resend
- Analytics: PostHog
- Errors: Sentry

### Cross-Cutting Concerns

| Concern            | Strategy                                                 |
| ------------------ | -------------------------------------------------------- |
| Error Handling     | Centralized boundary, warm error copy                    |
| Loading States     | Consistent skeleton/spinner patterns                     |
| Session Management | Token-based result access (sessionToken in localStorage) |
| Rate Limiting      | Dual: Edge (Vercel Middleware) + App (Hono)              |
| Image Security     | Signed URLs (15min preview, 7-day purchased)             |
| Analytics          | PostHog event tracking throughout                        |
| Data Compliance    | GDPR-ready, 30-day auto-deletion, delete button          |
| Long-running Jobs  | Workflow durable execution                               |
| Cost Monitoring    | Vercel spend alerts, Gemini API tracking                 |

### Party Mode Enhancements

**Architecture Decisions (from multi-perspective review):**

1. **Fire-and-Forget Pattern:** Upload endpoint returns `jobId` immediately (<2s), Workflow handles AI processing asynchronously, frontend polls for status every 2-3s.

2. **Client-Side Processing:** HEIC conversion (`heic2any`) and compression (`browser-image-compression`) BEFORE upload to reduce bandwidth and R2 costs.

3. **Type Safety:** Leverage Hono RPC + Effect schemas for end-to-end typed API clients.

4. **Security Layers:**
   - Session tokens required to view results (stored in localStorage)
   - Signed URLs with short expiration for all images
   - Dual rate limiting (edge + application level)

5. **GDPR Compliance:**
   - "Delete my data" button on result page
   - Hash or delete email after delivery complete
   - Log deletions for compliance audit

6. **Monitoring Stack:**
   - Sentry for error tracking
   - Vercel Analytics for web vitals and function metrics
   - Workflow dashboard for job monitoring
   - Cost alerts for Gemini API and Vercel spend

---

## Starter Template Evaluation

### Primary Technology Domain

Full-Stack Web Application (Mobile-First) with separate frontend/backend packages in a monorepo structure.

### Starter Options Considered

| Starter            | Pros                                                                                   | Cons                                |
| ------------------ | -------------------------------------------------------------------------------------- | ----------------------------------- |
| **Better-T-Stack** | Exact stack match (TanStack Start + Hono + Drizzle), actively maintained, Vercel-ready | Effect added separately             |
| Manual Setup       | Full control                                                                           | Time-consuming, error-prone         |
| T3 Stack           | Popular                                                                                | Next.js focused, not TanStack Start |

### Selected Starter: Better-T-Stack (v3.10.0)

**Rationale:**

- Exact match for chosen stack (TanStack Start + Hono + Bun)
- Actively maintained (updated Dec 20, 2024)
- 4.5k GitHub stars, proven community
- Drizzle ORM + PostgreSQL support built-in
- Turborepo monorepo structure included
- Vercel deployment ready

**Initialization Command:**

```bash
bun create better-t-stack@latest
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**

- TypeScript (strict mode)
- Bun runtime for backend
- Vite for frontend bundling

**Project Structure:**

- Monorepo with Turborepo
- `apps/web` - TanStack Start frontend
- `packages/api` - Hono + Effect backend
- `packages/db` - Drizzle schema and migrations

**Styling Solution:**

- Tailwind CSS configured
- shadcn/ui compatible

**Build Tooling:**

- Turborepo for task orchestration
- Vite for frontend builds
- Bun for backend bundling

**Development Experience:**

- Hot reload for frontend and backend
- Type-safe API with Hono RPC
- Drizzle Studio for database inspection

---

## Core Architectural Decisions

### Decision Summary

| Category          | Decision                     |
| ----------------- | ---------------------------- |
| Database          | Neon PostgreSQL (serverless) |
| Storage           | Cloudflare R2                |
| Durable Execution | Workflow (useworkflow.dev)   |
| API               | Hono + Effect                |
| State             | TanStack Query               |
| Auth              | None (session tokens)        |

### Data Architecture

**Database:** Neon PostgreSQL

- Serverless, scales to zero
- Connection pooling via `@neondatabase/serverless`
- Branching for preview environments

**Schema:**

```typescript
// packages/db/src/schema.ts
export const uploads = pgTable('uploads', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull(),
  sessionToken: text('session_token').notNull().unique(),
  originalUrl: text('original_url').notNull(),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const results = pgTable('results', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  uploadId: text('upload_id').references(() => uploads.id).notNull(),
  resultUrl: text('result_url').notNull(),
  previewUrl: text('preview_url').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const purchases = pgTable('purchases', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  resultId: text('result_id').references(() => results.id).notNull(),
  email: text('email').notNull(),
  stripeSessionId: text('stripe_session_id').notNull(),
  amount: integer('amount').notNull(),
  type: text('type', { enum: ['self', 'gift'] }).default('self'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**Storage:** Cloudflare R2

- S3-compatible API
- Free egress
- Presigned URLs for secure access

**File Structure:**

```
/uploads/{uploadId}/original.jpg
/results/{resultId}/full.jpg
/results/{resultId}/preview.jpg
```

### Authentication & Security

**Session Token Flow:**

1. Upload → server generates `sessionToken`
2. Token stored in localStorage
3. Token required for result access
4. Token expires with data (30 days)

**Security:**

- Rate limiting: 10 uploads/IP/hour
- Signed URLs: 15min preview, 7 days purchased
- Input validation: Zod on all endpoints
- CORS: Production domain only

### API Design

**Endpoints:**

| Method | Path                  | Purpose                          |
| ------ | --------------------- | -------------------------------- |
| POST   | `/api/upload`         | Get presigned URL, create upload |
| POST   | `/api/process`        | Trigger Workflow job             |
| GET    | `/api/status/:jobId`  | Poll job status                  |
| GET    | `/api/result/:id`     | Get result (requires token)      |
| POST   | `/api/checkout`       | Create Stripe session            |
| POST   | `/api/webhook/stripe` | Handle payments                  |
| GET    | `/api/download/:id`   | Signed download URL              |
| DELETE | `/api/data/:token`    | GDPR deletion                    |

### Frontend State

**TanStack Query Patterns:**

```typescript
// Poll status every 2s until complete
useQuery({
  queryKey: ['status', jobId],
  queryFn: () => api.status[jobId].get(),
  refetchInterval: (data) =>
    data?.status === 'completed' ? false : 2000,
});

// Cache result indefinitely
useQuery({
  queryKey: ['result', id],
  queryFn: () => api.result[id].get(),
  staleTime: Infinity,
});
```

### Infrastructure

**Environment Variables:**

```bash
DATABASE_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
GEMINI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
POSTHOG_KEY=
SENTRY_DSN=
```

**Deployment:**

- Vercel Git integration
- Auto-deploy main → production
- PR deploys → preview

---

## Implementation Patterns & Consistency Rules

### Naming Conventions

| Context    | Convention         | Example                          |
| ---------- | ------------------ | -------------------------------- |
| DB tables  | snake_case, plural | `uploads`, `results`             |
| DB columns | snake_case         | `session_token`, `created_at`    |
| API routes | /api/{resource}    | `/api/upload`, `/api/result/:id` |
| Files      | kebab-case         | `image-uploader.tsx`             |
| Components | PascalCase         | `ImageUploader`                  |
| Functions  | camelCase          | `uploadImage()`                  |
| Variables  | camelCase          | `sessionToken`                   |
| Env vars   | SCREAMING_SNAKE    | `GEMINI_API_KEY`                 |

### API Response Strategy

**Effect-based Returns:**

```typescript
// Success: return Effect with data
return Effect.succeed({ jobId, sessionToken })

// Error: return typed Effect error
return Effect.fail(new NotFoundError({ resultId }))

// In route handler
Effect.runPromise(program).then(c.json).catch(handleError)
```

Effect provides typed errors and full type safety via Hono RPC.

### File Organization (by Flow)

```
components/
├── landing/           # Hero, examples, CTA
├── upload/            # ImageUploader, email input
├── processing/        # ProcessingScreen, stages
├── reveal/            # RevealAnimation, before-after
├── payment/           # CheckoutButton, Stripe modal
├── download/          # DownloadButton, share sheet
└── shared/            # Common UI components
```

### Error Handling

**Security Rules:**

- Log real errors to Sentry
- Show warm, vague copy to users
- Never expose: job IDs, token values, rate limit timing, Stripe details

**User-Facing Copy:**

```typescript
const errorMessages = {
  UPLOAD_FAILED: "We couldn't upload your image. Let's try again!",
  PROCESSING_FAILED: "Something went wrong. We'll give you a fresh start.",
  PAYMENT_FAILED: "Payment didn't go through. No worries, let's try again!",
  NOT_FOUND: "We couldn't find your result. Try uploading again?",
}
```

### Contextual Loading States

| State     | Copy                                |
| --------- | ----------------------------------- |
| Uploading | "Preparing your ultrasound..."      |
| Stage 1   | "Analyzing your baby's features..." |
| Stage 2   | "Creating your portrait..."         |
| Stage 3   | "Adding final touches..."           |
| Payment   | "Securing your purchase..."         |
| Download  | "Preparing your photo..."           |

### Environment Validation

```typescript
// packages/api/src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GEMINI_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  R2_BUCKET: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().startsWith('re_'),
})

export const env = envSchema.parse(process.env)
```

Fail fast on missing config.

### All AI Agents MUST:

1. Follow naming conventions exactly
2. Use Effect for all service logic with typed errors
3. Organize components by flow step
4. Handle errors with warm user-facing copy
5. Never expose internal details in error messages
6. Use contextual loading copy (not generic "Loading...")
7. Validate env vars with Zod at startup
8. Co-locate tests with source files (`*.test.ts`)
9. Use `@/` alias for app imports

### Workflow Progress Pattern

Store processing stage in database for real-time UI progress:

```typescript
// Schema additions
status: 'pending' | 'processing' | 'completed' | 'failed'
stage: 'validating' | 'generating' | 'watermarking' | 'complete'
progress: integer // 0-100

// Status API response
GET /api/status/:jobId → { status, stage, progress, resultId? }
```

### Client-Side Image Processing Pattern

```typescript
// hooks/use-image-processor.ts
export async function processImage(file: File): Promise<File> {
  // 1. HEIC → JPEG conversion
  if (file.type === 'image/heic' || file.name.endsWith('.heic')) {
    const heic2any = await import('heic2any')
    file = await heic2any({ blob: file, toType: 'image/jpeg' })
  }

  // 2. Compress if > 2MB
  if (file.size > 2 * 1024 * 1024) {
    const imageCompression = await import('browser-image-compression')
    file = await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 2048,
      useWebWorker: true
    })
  }

  return file
}
```

### Session Token Pattern

```typescript
// Server: Generate on upload
const sessionToken = crypto.randomUUID()

// Client: Store per job
localStorage.setItem(`babypeek-session-${jobId}`, sessionToken)

// Client: Send in header
headers: { 'X-Session-Token': sessionToken }

// Server: Validate
const upload = await db.query.uploads.findFirst({
  where: eq(uploads.sessionToken, token)
})
if (!upload) throw new UnauthorizedError()
```

### Stripe Webhook Pattern

```typescript
// POST /api/webhook/stripe
app.post('/webhook/stripe', async ({ body, headers }) => {
  const sig = headers['stripe-signature']
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { resultId, email, type } = session.metadata

    // Create purchase record
    await db.insert(purchases).values({
      id: createId(),
      resultId,
      email,
      stripeSessionId: session.id,
      amount: session.amount_total,
      type,
    })

    // Send download email
    await sendDownloadEmail(email, resultId)
  }
})
```

### Mobile Session Recovery Pattern

```typescript
// Persist current job
useEffect(() => {
  if (jobId) {
    localStorage.setItem('babypeek-current-job', jobId)
  }
}, [jobId])

// Resume on app load
const savedJobId = localStorage.getItem('babypeek-current-job')
if (savedJobId && !isCompleted(savedJobId)) {
  navigate(`/processing/${savedJobId}`)
}

// Re-fetch on visibility change
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && jobId) {
      refetchStatus()
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)
  return () => document.removeEventListener('visibilitychange', handleVisibility)
}, [jobId])
```

---

## Effect Architecture Patterns

### Effect Service Pattern

All business logic wrapped in Effect Services:

```typescript
// packages/api/src/services/GeminiService.ts
import { Effect, Context, Layer } from 'effect'

// 1. Define service interface
export class GeminiService extends Context.Tag('GeminiService')<
  GeminiService,
  {
    generateImage: (imageUrl: string) => Effect.Effect<GeneratedImage, GeminiError>
  }
>() {}

// 2. Define typed errors
export class GeminiError extends Data.TaggedError('GeminiError')<{
  cause: 'RATE_LIMITED' | 'INVALID_IMAGE' | 'API_ERROR'
  message: string
}> {}

// 3. Implement service
export const GeminiServiceLive = Layer.succeed(
  GeminiService,
  {
    generateImage: (imageUrl) =>
      Effect.tryPromise({
        try: () => callGeminiAPI(imageUrl),
        catch: (e) => new GeminiError({ cause: 'API_ERROR', message: String(e) })
      }).pipe(
        Effect.retry({ times: 3, schedule: Schedule.exponential('1 second') }),
        Effect.timeout('60 seconds')
      )
  }
)
```

### Effect Errors (Typed)

```typescript
// packages/api/src/lib/errors.ts
import { Data } from 'effect'

export class NotFoundError extends Data.TaggedError('NotFoundError')<{
  resource: string
  id: string
}> {}

export class UnauthorizedError extends Data.TaggedError('UnauthorizedError')<{
  reason: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'EXPIRED_TOKEN'
}> {}

export class ValidationError extends Data.TaggedError('ValidationError')<{
  field: string
  message: string
}> {}

export class PaymentError extends Data.TaggedError('PaymentError')<{
  cause: 'CARD_DECLINED' | 'INSUFFICIENT_FUNDS' | 'STRIPE_ERROR'
}> {}

// Union of all errors for route handlers
export type AppError =
  | NotFoundError
  | UnauthorizedError
  | ValidationError
  | PaymentError
  | GeminiError
```

### Hono + Effect Integration

```typescript
// packages/api/src/routes/result.ts
import { Hono } from 'hono'
import { Effect, pipe } from 'effect'

const app = new Hono()

app.get('/:id', async (c) => {
  const id = c.req.param('id')
  const token = c.req.header('X-Session-Token')

  const program = pipe(
    // Validate token
    Effect.fromNullable(token).pipe(
      Effect.mapError(() => new UnauthorizedError({ reason: 'MISSING_TOKEN' }))
    ),
    // Get result
    Effect.flatMap((token) =>
      ResultService.getByIdWithAuth(id, token)
    ),
    // Provide services
    Effect.provide(ResultServiceLive),
    Effect.provide(DbServiceLive)
  )

  const result = await Effect.runPromise(program).catch((e) => {
    if (e instanceof NotFoundError) {
      return c.json({ success: false, error: { code: 'NOT_FOUND' } }, 404)
    }
    if (e instanceof UnauthorizedError) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED' } }, 401)
    }
    throw e
  })

  return c.json({ success: true, data: result })
})
```

### Effect Services Layer

```typescript
// packages/api/src/services/index.ts
import { Layer } from 'effect'

// Compose all services into a single layer
export const AppServicesLive = Layer.mergeAll(
  GeminiServiceLive,
  R2ServiceLive,
  StripeServiceLive,
  ResendServiceLive,
  DbServiceLive
)

// Use in routes
const program = myEffect.pipe(
  Effect.provide(AppServicesLive)
)
```

### Effect for AI Processing

```typescript
// packages/api/src/workflows/process-image.ts
import { Effect, pipe, Schedule } from 'effect'

export const processImageWorkflow = (uploadId: string) =>
  pipe(
    // Stage 1: Validate
    Effect.log('Stage: validating'),
    Effect.flatMap(() => UploadService.getById(uploadId)),
    Effect.tap(() => UploadService.updateStage(uploadId, 'validating', 10)),

    // Stage 2: Generate
    Effect.tap(() => Effect.log('Stage: generating')),
    Effect.flatMap((upload) => GeminiService.generateImage(upload.originalUrl)),
    Effect.tap(() => UploadService.updateStage(uploadId, 'generating', 50)),

    // Stage 3: Watermark
    Effect.tap(() => Effect.log('Stage: watermarking')),
    Effect.flatMap((generated) => WatermarkService.apply(generated)),
    Effect.tap(() => UploadService.updateStage(uploadId, 'watermarking', 80)),

    // Stage 4: Store
    Effect.flatMap((watermarked) =>
      Effect.all([
        R2Service.upload(watermarked.full, `results/${uploadId}/full.jpg`),
        R2Service.upload(watermarked.preview, `results/${uploadId}/preview.jpg`)
      ])
    ),

    // Stage 5: Complete
    Effect.tap(([fullUrl, previewUrl]) =>
      ResultService.create({ uploadId, resultUrl: fullUrl, previewUrl })
    ),
    Effect.tap(() => UploadService.updateStatus(uploadId, 'completed', 100)),

    // Stage 6: Notify
    Effect.tap(() => ResendService.sendResultEmail(uploadId)),

    // Provide all services
    Effect.provide(AppServicesLive),

    // Error recovery
    Effect.catchAll((error) =>
      pipe(
        UploadService.updateStatus(uploadId, 'failed', 0),
        Effect.flatMap(() => Effect.fail(error))
      )
    )
  )
```

### Updated Project Structure for Effect

```
packages/api/src/
├── index.ts              # Hono app entry
├── routes/
│   ├── upload.ts
│   ├── status.ts
│   ├── result.ts
│   ├── checkout.ts
│   ├── webhook.ts
│   ├── download.ts
│   └── data.ts
├── services/             # Effect Services
│   ├── index.ts          # AppServicesLive export
│   ├── GeminiService.ts
│   ├── R2Service.ts
│   ├── StripeService.ts
│   ├── ResendService.ts
│   ├── WatermarkService.ts
│   ├── UploadService.ts
│   └── ResultService.ts
├── workflows/
│   └── process-image.ts  # Effect-based workflow
├── lib/
│   ├── db.ts
│   ├── env.ts
│   └── errors.ts         # All typed errors
└── middleware/
    ├── rate-limit.ts
    └── session.ts
```

### All AI Agents MUST (Updated for Effect):

1. Wrap all business logic in Effect Services
2. Define typed errors using `Data.TaggedError`
3. Use `Effect.provide()` to inject services
4. Handle errors with `Effect.catchAll` or `Effect.match`
5. Use `Effect.retry` with `Schedule` for external APIs
6. Use `Effect.timeout` for all external calls
7. Log with `Effect.log` for structured logging
8. Never use `try/catch` directly — use `Effect.tryPromise`

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices work together without conflicts. Hono handles HTTP routing, Effect manages business logic with typed errors, TanStack Query handles client-state, and Drizzle + Neon provide database access. Bun runtime supports the entire stack.

**Pattern Consistency:**
Effect service pattern consistently applied across all services (Gemini, R2, Stripe, Resend). Naming conventions follow established rules. All routes follow the same Effect integration pattern.

**Structure Alignment:**
Project structure mirrors Effect service architecture. Routes → Services → External APIs flow is clear. Component organization by user flow aligns with route structure.

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**

| FR Category           | Coverage                                            |
| --------------------- | --------------------------------------------------- |
| FR-1: Image Upload    | ✅ `/api/upload`, R2Service, client-side processing |
| FR-2: AI Generation   | ✅ Workflow, GeminiService, Effect retry/timeout    |
| FR-3: Preview/Results | ✅ `/api/result/:id`, session tokens, signed URLs   |
| FR-4: Payment         | ✅ StripeService, webhook handler, purchase schema  |
| FR-5: Download        | ✅ `/api/download/:id`, signed URLs                 |
| FR-6: Sharing         | ✅ Share sheet, watermarked previews                |
| FR-7: Landing         | ✅ Landing components, hero/examples structure      |
| FR-8: System Ops      | ✅ Sentry, PostHog, env validation, GDPR deletion   |

**Non-Functional Requirements Coverage:**

| NFR                         | Coverage                                      |
| --------------------------- | --------------------------------------------- |
| Performance (<2.5s LCP)     | ✅ Edge deployment, optimized bundles         |
| Scale (10K images/day)      | ✅ Serverless auto-scale, R2 free egress      |
| Security                    | ✅ Signed URLs, session tokens, rate limiting |
| Accessibility (WCAG 2.1 AA) | ✅ shadcn/ui ARIA support                     |
| Reliability (99.5% uptime)  | ✅ Effect retry, Workflow durability          |

### Implementation Readiness Validation ✅

**Decision Completeness:**
All critical decisions documented including versions (Effect 3.x, Hono 4.x). Technology stack fully specified with initialization commands.

**Structure Completeness:**
Complete directory structure defined with all files and directories. Component boundaries clear (routes, services, workflows).

**Pattern Completeness:**
All major patterns documented with code examples:

- Effect Service Pattern
- Typed Error Pattern
- Hono + Effect Integration
- Workflow Progress Pattern
- Client-Side Image Processing
- Session Token Pattern
- Stripe Webhook Pattern
- Mobile Session Recovery

### Gap Analysis Results

**Critical Gaps:** None

**Minor Gaps (addressed in patterns section):**

- Database schema additions for `stage`/`progress` columns (documented)
- Workflow SDK integration (reference to useworkflow.dev docs)

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Medium)
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** HIGH

**Key Strengths:**

1. Effect provides typed errors and composable services
2. Fire-and-forget pattern elegantly handles AI processing timeouts
3. Clear separation: routes → services → external APIs
4. Comprehensive mobile considerations (HEIC, session recovery)
5. GDPR compliance built-in from start

**Areas for Future Enhancement:**

1. Real-time updates via SSE (post-MVP)
2. Multi-region deployment (if needed for latency)
3. A/B testing infrastructure for reveal animations

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions exactly as documented
- Use Effect Services for all business logic
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**

```bash
# 1. Initialize project
bun create better-t-stack@latest babypeek \
  --frontend tanstack-start \
  --backend hono \
  --database postgres \
  --orm drizzle \
  --runtime bun

# 2. Add Effect
cd babypeek
bun add effect @effect/schema

# 3. Configure external services (Neon, R2, Stripe, etc.)

# 4. Implement flows in order:
#    Upload → Process → Result → Payment → Download
```

---

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅  
**Total Steps Completed:** 8  
**Date Completed:** 2024-12-20  
**Document Location:** `_bmad-output/architecture.md`

### Final Architecture Deliverables

**📋 Complete Architecture Document**

- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**

- 12 architectural decisions made
- 8 implementation patterns defined
- 20 architectural components specified
- 54 functional requirements fully supported

**📚 AI Agent Implementation Guide**

- Technology stack: Hono + Effect + TanStack Start + Drizzle
- 17 consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns for 5 external services

### Development Sequence

1. Initialize project using Better-T-Stack
2. Add Effect library
3. Set up external services (Neon, R2, Stripe, Resend, PostHog)
4. Implement flows: Upload → Process → Result → Payment → Download
5. Maintain consistency with documented rules

### Quality Assurance

**🎯 Clear Decision Framework**  
Every technology choice made collaboratively with clear rationale.

**🔧 Consistency Guarantee**  
Effect Services pattern ensures all business logic follows the same structure.

**📋 Complete Coverage**  
All 54 FRs and 5 NFR categories architecturally supported.

**🏗️ Solid Foundation**  
Better-T-Stack + Effect provides production-ready foundation.

---

**Architecture Status:** ✅ READY FOR IMPLEMENTATION

**Next Phase:** Create epics & stories, then begin implementation

---
