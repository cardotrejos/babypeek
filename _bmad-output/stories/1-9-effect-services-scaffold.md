# Story 1.9: Effect Services Scaffold

**Epic:** 1 - Foundation & Observability  
**Status:** done  
**Created:** 2024-12-21  
**Priority:** 🟢 P2 (Enhancement)

---

## User Story

As a **developer**,  
I want **Effect Services pattern scaffolded for all core services**,  
So that **I have a consistent architecture to build on**.

---

## Acceptance Criteria

| # | Criterion | Test |
|---|-----------|------|
| AC1 | Service scaffold exists for GeminiService | File exists with typed interface |
| AC2 | Service scaffold exists for R2Service | File exists with typed interface |
| AC3 | Service scaffold exists for StripeService | File exists with typed interface |
| AC4 | Service scaffold exists for ResendService | File exists with typed interface |
| AC5 | Service scaffold exists for UploadService | File exists with typed interface |
| AC6 | Service scaffold exists for ResultService | File exists with typed interface |
| AC7 | Typed errors defined in errors.ts | All error types exported |
| AC8 | AppServicesLive layer exports all services | Single import provides all services |
| AC9 | Example implementation demonstrates pattern | At least one service has working implementation |

---

## Tasks / Subtasks

- [x] **Task 1: Create Typed Error Definitions** (AC: 7)
  - [x] 1.1 Create `packages/api/src/lib/errors.ts`
  - [x] 1.2 Define `NotFoundError` with resource/id
  - [x] 1.3 Define `UnauthorizedError` with reason enum
  - [x] 1.4 Define `ValidationError` with field/message
  - [x] 1.5 Define `PaymentError` with cause enum
  - [x] 1.6 Define `GeminiError` with cause enum
  - [x] 1.7 Define `R2Error` for storage failures
  - [x] 1.8 Define `EmailError` for Resend failures
  - [x] 1.9 Export `AppError` union type

- [x] **Task 2: Create GeminiService Scaffold** (AC: 1)
  - [x] 2.1 Create `packages/api/src/services/GeminiService.ts`
  - [x] 2.2 Define service interface with `generateImage` method
  - [x] 2.3 Create `GeminiServiceLive` layer with placeholder
  - [x] 2.4 Export service tag and layer

- [x] **Task 3: Create R2Service Scaffold** (AC: 2, 9)
  - [x] 3.1 Create `packages/api/src/services/R2Service.ts`
  - [x] 3.2 Define interface: `generatePresignedUploadUrl`, `generatePresignedDownloadUrl`, `upload`, `delete`
  - [x] 3.3 Implement `R2ServiceLive` using existing R2 setup from Story 1.3
  - [x] 3.4 Export service tag and layer

- [x] **Task 4: Create StripeService Scaffold** (AC: 3)
  - [x] 4.1 Create `packages/api/src/services/StripeService.ts`
  - [x] 4.2 Define interface: `createCheckoutSession`, `constructWebhookEvent`, `retrieveSession`
  - [x] 4.3 Create `StripeServiceLive` layer with placeholder
  - [x] 4.4 Export service tag and layer

- [x] **Task 5: Create ResendService Scaffold** (AC: 4)
  - [x] 5.1 Create `packages/api/src/services/ResendService.ts`
  - [x] 5.2 Define interface: `sendResultEmail`, `sendReceiptEmail`, `sendDownloadEmail`
  - [x] 5.3 Create `ResendServiceLive` layer with placeholder
  - [x] 5.4 Export service tag and layer

- [x] **Task 6: Create UploadService Scaffold** (AC: 5)
  - [x] 6.1 Create `packages/api/src/services/UploadService.ts`
  - [x] 6.2 Define interface: `create`, `getById`, `updateStatus`, `updateStage`
  - [x] 6.3 Create `UploadServiceLive` layer with db integration
  - [x] 6.4 Export service tag and layer

- [x] **Task 7: Create ResultService Scaffold** (AC: 6)
  - [x] 7.1 Create `packages/api/src/services/ResultService.ts`
  - [x] 7.2 Define interface: `create`, `getById`, `getByIdWithAuth`
  - [x] 7.3 Create `ResultServiceLive` layer with db integration
  - [x] 7.4 Export service tag and layer

- [x] **Task 8: Create AppServicesLive Layer** (AC: 8)
  - [x] 8.1 Create `packages/api/src/services/index.ts`
  - [x] 8.2 Import all service layers
  - [x] 8.3 Compose with `Layer.mergeAll`
  - [x] 8.4 Export `AppServicesLive` and all individual services

---

## Dev Notes

### Architecture Requirements

**From `architecture.md`:**

- All business logic wrapped in Effect Services
- Define typed errors using `Data.TaggedError`
- Use `Effect.provide()` to inject services
- Handle errors with `Effect.catchAll` or `Effect.match`
- Use `Effect.retry` with `Schedule` for external APIs
- Use `Effect.timeout` for all external calls
- Never use `try/catch` directly — use `Effect.tryPromise`

### Typed Errors Pattern

**Errors File (`packages/api/src/lib/errors.ts`):**

```typescript
import { Data } from 'effect'

// Domain Errors
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

// External Service Errors
export class GeminiError extends Data.TaggedError('GeminiError')<{
  cause: 'RATE_LIMITED' | 'INVALID_IMAGE' | 'CONTENT_POLICY' | 'API_ERROR' | 'TIMEOUT'
  message: string
}> {}

export class R2Error extends Data.TaggedError('R2Error')<{
  cause: 'UPLOAD_FAILED' | 'DOWNLOAD_FAILED' | 'DELETE_FAILED' | 'PRESIGN_FAILED'
  message: string
}> {}

export class PaymentError extends Data.TaggedError('PaymentError')<{
  cause: 'CARD_DECLINED' | 'INSUFFICIENT_FUNDS' | 'STRIPE_ERROR' | 'WEBHOOK_INVALID'
  message: string
}> {}

export class EmailError extends Data.TaggedError('EmailError')<{
  cause: 'SEND_FAILED' | 'TEMPLATE_ERROR' | 'INVALID_EMAIL'
  message: string
}> {}

// Union of all errors
export type AppError =
  | NotFoundError
  | UnauthorizedError
  | ValidationError
  | GeminiError
  | R2Error
  | PaymentError
  | EmailError
```

### Service Pattern Template

**Service Template:**

```typescript
import { Effect, Context, Layer, Data } from 'effect'

// 1. Define service interface
export class MyService extends Context.Tag('MyService')<
  MyService,
  {
    myMethod: (param: string) => Effect.Effect<Result, MyError>
  }
>() {}

// 2. Implement live layer
export const MyServiceLive = Layer.succeed(
  MyService,
  {
    myMethod: (param) =>
      Effect.tryPromise({
        try: async () => {
          // Implementation
        },
        catch: (e) => new MyError({ cause: 'ERROR', message: String(e) })
      })
  }
)

// 3. Export tag and layer
export { MyService, MyServiceLive }
```

### GeminiService Scaffold

**File (`packages/api/src/services/GeminiService.ts`):**

```typescript
import { Effect, Context, Layer, Schedule } from 'effect'
import { GeminiError } from '@/lib/errors'

export interface GeneratedImage {
  blob: Blob
  mimeType: string
}

export class GeminiService extends Context.Tag('GeminiService')<
  GeminiService,
  {
    generateImage: (imageUrl: string, prompt: string) => Effect.Effect<GeneratedImage, GeminiError>
  }
>() {}

export const GeminiServiceLive = Layer.succeed(
  GeminiService,
  {
    generateImage: (imageUrl, prompt) =>
      Effect.tryPromise({
        try: async () => {
          // TODO: Implement Gemini Imagen 3 API call
          // Will be implemented in Epic 4 (AI Processing)
          throw new Error('Not implemented')
        },
        catch: (e) => new GeminiError({ 
          cause: 'API_ERROR', 
          message: String(e) 
        })
      }).pipe(
        Effect.retry({
          times: 3,
          schedule: Schedule.exponential('1 second')
        }),
        Effect.timeout('60 seconds'),
        Effect.catchTag('TimeoutException', () =>
          Effect.fail(new GeminiError({ cause: 'TIMEOUT', message: 'Gemini API timed out' }))
        )
      )
  }
)
```

### R2Service Scaffold (Full Implementation)

**File (`packages/api/src/services/R2Service.ts`):**

```typescript
import { Effect, Context, Layer } from 'effect'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { R2Error } from '@/lib/errors'
import { env } from '@/lib/env'

export interface PresignedUrl {
  url: string
  key: string
  expiresAt: Date
}

export class R2Service extends Context.Tag('R2Service')<
  R2Service,
  {
    generatePresignedUploadUrl: (key: string, contentType: string) => Effect.Effect<PresignedUrl, R2Error>
    generatePresignedDownloadUrl: (key: string, expiresIn?: number) => Effect.Effect<PresignedUrl, R2Error>
    upload: (key: string, body: Buffer, contentType: string) => Effect.Effect<string, R2Error>
    delete: (key: string) => Effect.Effect<void, R2Error>
  }
>() {}

const createS3Client = () =>
  new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })

export const R2ServiceLive = Layer.succeed(
  R2Service,
  {
    generatePresignedUploadUrl: (key, contentType) =>
      Effect.tryPromise({
        try: async () => {
          const client = createS3Client()
          const expiresIn = 15 * 60 // 15 minutes
          const command = new PutObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: key,
            ContentType: contentType,
          })
          const url = await getSignedUrl(client, command, { expiresIn })
          return {
            url,
            key,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
          }
        },
        catch: (e) => new R2Error({ cause: 'PRESIGN_FAILED', message: String(e) })
      }),

    generatePresignedDownloadUrl: (key, expiresIn = 7 * 24 * 60 * 60) =>
      Effect.tryPromise({
        try: async () => {
          const client = createS3Client()
          const command = new GetObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: key,
          })
          const url = await getSignedUrl(client, command, { expiresIn })
          return {
            url,
            key,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
          }
        },
        catch: (e) => new R2Error({ cause: 'PRESIGN_FAILED', message: String(e) })
      }),

    upload: (key, body, contentType) =>
      Effect.tryPromise({
        try: async () => {
          const client = createS3Client()
          await client.send(new PutObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
          }))
          return `https://${env.R2_BUCKET}.r2.cloudflarestorage.com/${key}`
        },
        catch: (e) => new R2Error({ cause: 'UPLOAD_FAILED', message: String(e) })
      }),

    delete: (key) =>
      Effect.tryPromise({
        try: async () => {
          const client = createS3Client()
          await client.send(new DeleteObjectCommand({
            Bucket: env.R2_BUCKET,
            Key: key,
          }))
        },
        catch: (e) => new R2Error({ cause: 'DELETE_FAILED', message: String(e) })
      }),
  }
)
```

### StripeService Scaffold

**File (`packages/api/src/services/StripeService.ts`):**

```typescript
import { Effect, Context, Layer } from 'effect'
import Stripe from 'stripe'
import { PaymentError } from '@/lib/errors'
import { env } from '@/lib/env'

export interface CheckoutSessionParams {
  resultId: string
  email: string
  type: 'self' | 'gift'
  successUrl: string
  cancelUrl: string
}

export class StripeService extends Context.Tag('StripeService')<
  StripeService,
  {
    createCheckoutSession: (params: CheckoutSessionParams) => Effect.Effect<Stripe.Checkout.Session, PaymentError>
    constructWebhookEvent: (payload: string, signature: string) => Effect.Effect<Stripe.Event, PaymentError>
    retrieveSession: (sessionId: string) => Effect.Effect<Stripe.Checkout.Session, PaymentError>
  }
>() {}

const getStripeClient = () => new Stripe(env.STRIPE_SECRET_KEY)

export const StripeServiceLive = Layer.succeed(
  StripeService,
  {
    createCheckoutSession: (params) =>
      Effect.tryPromise({
        try: async () => {
          const stripe = getStripeClient()
          return await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: 'usd',
                product_data: { name: 'babypeek HD Photo' },
                unit_amount: 999, // $9.99
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: params.successUrl,
            cancel_url: params.cancelUrl,
            customer_email: params.email,
            metadata: {
              resultId: params.resultId,
              email: params.email,
              type: params.type,
            },
          })
        },
        catch: (e) => new PaymentError({ cause: 'STRIPE_ERROR', message: String(e) })
      }),

    constructWebhookEvent: (payload, signature) =>
      Effect.tryPromise({
        try: async () => {
          const stripe = getStripeClient()
          return stripe.webhooks.constructEvent(
            payload,
            signature,
            env.STRIPE_WEBHOOK_SECRET
          )
        },
        catch: () => new PaymentError({ cause: 'WEBHOOK_INVALID', message: 'Invalid webhook signature' })
      }),

    retrieveSession: (sessionId) =>
      Effect.tryPromise({
        try: async () => {
          const stripe = getStripeClient()
          return await stripe.checkout.sessions.retrieve(sessionId)
        },
        catch: (e) => new PaymentError({ cause: 'STRIPE_ERROR', message: String(e) })
      }),
  }
)
```

### ResendService Scaffold

**File (`packages/api/src/services/ResendService.ts`):**

```typescript
import { Effect, Context, Layer } from 'effect'
import { Resend } from 'resend'
import { EmailError } from '@/lib/errors'
import { env } from '@/lib/env'

export class ResendService extends Context.Tag('ResendService')<
  ResendService,
  {
    sendResultEmail: (email: string, resultId: string) => Effect.Effect<void, EmailError>
    sendReceiptEmail: (email: string, purchaseId: string, amount: number) => Effect.Effect<void, EmailError>
    sendDownloadEmail: (email: string, resultId: string, downloadUrl: string) => Effect.Effect<void, EmailError>
  }
>() {}

const getResendClient = () => new Resend(env.RESEND_API_KEY)

export const ResendServiceLive = Layer.succeed(
  ResendService,
  {
    sendResultEmail: (email, resultId) =>
      Effect.tryPromise({
        try: async () => {
          const resend = getResendClient()
          await resend.emails.send({
            from: 'babypeek <noreply@babypeek.com>',
            to: email,
            subject: 'Your babypeek portrait is ready! 🎉',
            html: `
              <h1>Your baby portrait is ready!</h1>
              <p>View your result: <a href="https://babypeek.com/result/${resultId}">Click here</a></p>
            `,
          })
        },
        catch: (e) => new EmailError({ cause: 'SEND_FAILED', message: String(e) })
      }),

    sendReceiptEmail: (email, purchaseId, amount) =>
      Effect.tryPromise({
        try: async () => {
          const resend = getResendClient()
          await resend.emails.send({
            from: 'babypeek <noreply@babypeek.com>',
            to: email,
            subject: 'Your babypeek purchase receipt',
            html: `
              <h1>Thank you for your purchase!</h1>
              <p>Amount: $${(amount / 100).toFixed(2)}</p>
              <p>Order ID: ${purchaseId}</p>
            `,
          })
        },
        catch: (e) => new EmailError({ cause: 'SEND_FAILED', message: String(e) })
      }),

    sendDownloadEmail: (email, resultId, downloadUrl) =>
      Effect.tryPromise({
        try: async () => {
          const resend = getResendClient()
          await resend.emails.send({
            from: 'babypeek <noreply@babypeek.com>',
            to: email,
            subject: 'Your HD photo is ready to download! 📸',
            html: `
              <h1>Download your HD photo</h1>
              <p><a href="${downloadUrl}">Download now</a></p>
              <p>This link expires in 7 days.</p>
            `,
          })
        },
        catch: (e) => new EmailError({ cause: 'SEND_FAILED', message: String(e) })
      }),
  }
)
```

### UploadService Scaffold

**File (`packages/api/src/services/UploadService.ts`):**

```typescript
import { Effect, Context, Layer } from 'effect'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { uploads } from '@/db/schema'
import { NotFoundError } from '@/lib/errors'

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type UploadStage = 'validating' | 'generating' | 'watermarking' | 'complete'

export interface Upload {
  id: string
  email: string
  sessionToken: string
  originalUrl: string
  status: UploadStatus
  stage?: UploadStage
  progress?: number
  createdAt: Date
}

export interface CreateUploadParams {
  email: string
  sessionToken: string
  originalUrl: string
}

export class UploadService extends Context.Tag('UploadService')<
  UploadService,
  {
    create: (params: CreateUploadParams) => Effect.Effect<Upload, never>
    getById: (id: string) => Effect.Effect<Upload, NotFoundError>
    getBySessionToken: (token: string) => Effect.Effect<Upload, NotFoundError>
    updateStatus: (id: string, status: UploadStatus, progress?: number) => Effect.Effect<void, NotFoundError>
    updateStage: (id: string, stage: UploadStage, progress: number) => Effect.Effect<void, NotFoundError>
  }
>() {}

export const UploadServiceLive = Layer.succeed(
  UploadService,
  {
    create: (params) =>
      Effect.promise(async () => {
        const [upload] = await db.insert(uploads).values({
          email: params.email,
          sessionToken: params.sessionToken,
          originalUrl: params.originalUrl,
          status: 'pending',
        }).returning()
        return upload as Upload
      }),

    getById: (id) =>
      Effect.promise(async () => {
        const upload = await db.query.uploads.findFirst({
          where: eq(uploads.id, id)
        })
        return upload as Upload | undefined
      }).pipe(
        Effect.flatMap((upload) =>
          upload
            ? Effect.succeed(upload)
            : Effect.fail(new NotFoundError({ resource: 'upload', id }))
        )
      ),

    getBySessionToken: (token) =>
      Effect.promise(async () => {
        const upload = await db.query.uploads.findFirst({
          where: eq(uploads.sessionToken, token)
        })
        return upload as Upload | undefined
      }).pipe(
        Effect.flatMap((upload) =>
          upload
            ? Effect.succeed(upload)
            : Effect.fail(new NotFoundError({ resource: 'upload', id: token }))
        )
      ),

    updateStatus: (id, status, progress) =>
      Effect.promise(async () => {
        const result = await db.update(uploads)
          .set({ status, ...(progress !== undefined && { progress }) })
          .where(eq(uploads.id, id))
          .returning()
        return result[0]
      }).pipe(
        Effect.flatMap((upload) =>
          upload
            ? Effect.void
            : Effect.fail(new NotFoundError({ resource: 'upload', id }))
        )
      ),

    updateStage: (id, stage, progress) =>
      Effect.promise(async () => {
        const result = await db.update(uploads)
          .set({ stage, progress })
          .where(eq(uploads.id, id))
          .returning()
        return result[0]
      }).pipe(
        Effect.flatMap((upload) =>
          upload
            ? Effect.void
            : Effect.fail(new NotFoundError({ resource: 'upload', id }))
        )
      ),
  }
)
```

### ResultService Scaffold

**File (`packages/api/src/services/ResultService.ts`):**

```typescript
import { Effect, Context, Layer } from 'effect'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { results, uploads } from '@/db/schema'
import { NotFoundError, UnauthorizedError } from '@/lib/errors'

export interface Result {
  id: string
  uploadId: string
  resultUrl: string
  previewUrl: string
  createdAt: Date
}

export interface CreateResultParams {
  uploadId: string
  resultUrl: string
  previewUrl: string
}

export class ResultService extends Context.Tag('ResultService')<
  ResultService,
  {
    create: (params: CreateResultParams) => Effect.Effect<Result, never>
    getById: (id: string) => Effect.Effect<Result, NotFoundError>
    getByIdWithAuth: (id: string, sessionToken: string) => Effect.Effect<Result, NotFoundError | UnauthorizedError>
    getByUploadId: (uploadId: string) => Effect.Effect<Result, NotFoundError>
  }
>() {}

export const ResultServiceLive = Layer.succeed(
  ResultService,
  {
    create: (params) =>
      Effect.promise(async () => {
        const [result] = await db.insert(results).values({
          uploadId: params.uploadId,
          resultUrl: params.resultUrl,
          previewUrl: params.previewUrl,
        }).returning()
        return result as Result
      }),

    getById: (id) =>
      Effect.promise(async () => {
        const result = await db.query.results.findFirst({
          where: eq(results.id, id)
        })
        return result as Result | undefined
      }).pipe(
        Effect.flatMap((result) =>
          result
            ? Effect.succeed(result)
            : Effect.fail(new NotFoundError({ resource: 'result', id }))
        )
      ),

    getByIdWithAuth: (id, sessionToken) =>
      Effect.promise(async () => {
        const result = await db.query.results.findFirst({
          where: eq(results.id, id),
          with: { upload: true }
        })
        return result as (Result & { upload: { sessionToken: string } }) | undefined
      }).pipe(
        Effect.flatMap((result) => {
          if (!result) {
            return Effect.fail(new NotFoundError({ resource: 'result', id }))
          }
          if (result.upload.sessionToken !== sessionToken) {
            return Effect.fail(new UnauthorizedError({ reason: 'INVALID_TOKEN' }))
          }
          return Effect.succeed(result)
        })
      ),

    getByUploadId: (uploadId) =>
      Effect.promise(async () => {
        const result = await db.query.results.findFirst({
          where: eq(results.uploadId, uploadId)
        })
        return result as Result | undefined
      }).pipe(
        Effect.flatMap((result) =>
          result
            ? Effect.succeed(result)
            : Effect.fail(new NotFoundError({ resource: 'result', id: uploadId }))
        )
      ),
  }
)
```

### AppServicesLive Composition

**File (`packages/api/src/services/index.ts`):**

```typescript
import { Layer } from 'effect'

// Import all services
export { GeminiService, GeminiServiceLive } from './GeminiService'
export { R2Service, R2ServiceLive } from './R2Service'
export { StripeService, StripeServiceLive } from './StripeService'
export { ResendService, ResendServiceLive } from './ResendService'
export { UploadService, UploadServiceLive } from './UploadService'
export { ResultService, ResultServiceLive } from './ResultService'

// Import layers
import { GeminiServiceLive } from './GeminiService'
import { R2ServiceLive } from './R2Service'
import { StripeServiceLive } from './StripeService'
import { ResendServiceLive } from './ResendService'
import { UploadServiceLive } from './UploadService'
import { ResultServiceLive } from './ResultService'

// Compose all services into single layer
export const AppServicesLive = Layer.mergeAll(
  GeminiServiceLive,
  R2ServiceLive,
  StripeServiceLive,
  ResendServiceLive,
  UploadServiceLive,
  ResultServiceLive
)
```

### Usage Example in Route

**Route Handler Example:**

```typescript
import { Hono } from 'hono'
import { Effect, pipe } from 'effect'
import { R2Service, AppServicesLive } from '@/services'
import { NotFoundError } from '@/lib/errors'

const app = new Hono()

app.post('/upload/presign', async (c) => {
  const { contentType } = await c.req.json()
  const key = `uploads/${crypto.randomUUID()}`

  const program = pipe(
    R2Service,
    Effect.flatMap((r2) => r2.generatePresignedUploadUrl(key, contentType)),
    Effect.provide(AppServicesLive)
  )

  const result = await Effect.runPromise(program).catch((e) => {
    if (e instanceof NotFoundError) {
      return c.json({ error: 'Not found' }, 404)
    }
    throw e
  })

  return c.json(result)
})
```

### File Locations

| File | Purpose |
|------|---------|
| `packages/api/src/lib/errors.ts` | All typed error definitions |
| `packages/api/src/services/GeminiService.ts` | AI generation service |
| `packages/api/src/services/R2Service.ts` | Storage service (full impl) |
| `packages/api/src/services/StripeService.ts` | Payment service |
| `packages/api/src/services/ResendService.ts` | Email service |
| `packages/api/src/services/UploadService.ts` | Upload management |
| `packages/api/src/services/ResultService.ts` | Result management |
| `packages/api/src/services/index.ts` | AppServicesLive export |

### Dependencies

```bash
cd packages/api
# Effect should already be installed from Story 1.1
# Other deps should exist from previous stories
bun add effect # if not already installed
```

### Previous Story Learnings

**From Story 1.1:**
- Effect 3.x installed with `@effect/schema`
- Monorepo structure with `packages/api`

**From Story 1.3:**
- R2 already configured with `@aws-sdk/client-s3`
- Presigned URL functions exist - refactor into R2Service

**From Story 1.4:**
- Environment validation with Zod
- `env` object exported from `packages/api/src/lib/env.ts`

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4

### Debug Log References

N/A

### Completion Notes List

- Updated `packages/api/src/lib/errors.ts` with GeminiError, R2Error, EmailError
- Extended PaymentError with WEBHOOK_INVALID cause
- Reorganized errors into Domain Errors and External Service Errors sections
- Added 4 new error tests (13 total API tests passing)
- Created `packages/api/src/services/GeminiService.ts` with generateImage method placeholder
- Extended `packages/api/src/services/R2Service.ts` with upload, delete, generatePresignedUploadUrl, generatePresignedDownloadUrl methods
- Moved R2Error from R2Service to centralized errors.ts
- Created `packages/api/src/services/StripeService.ts` with checkout, webhook, and session retrieval
- Created `packages/api/src/services/ResendService.ts` with result, receipt, and download email methods
- Created `packages/api/src/services/UploadService.ts` with CRUD operations for uploads table
- Created `packages/api/src/services/ResultService.ts` with result retrieval and auth validation
- Updated `packages/api/src/services/index.ts` with AppServicesLive layer composition
- Fixed storage.ts to import R2Error from errors.ts
- Installed missing dependencies: stripe, resend, drizzle-orm
- Fixed env.ts Zod 4 compatibility (required_error → message)

**Code Review Fixes (2024-12-21):**
- [M1] Extracted hardcoded price ($9.99) to `PRODUCT_PRICE_CENTS` env variable
- [M2] Added `APP_URL` and `FROM_EMAIL` env variables for configurable URLs
- [M3] Added Effect.retry() with exponential backoff to StripeService and ResendService
- [M4] Added Effect.timeout("30 seconds") to StripeService and ResendService
- [M5] Standardized null client handling using Effect-based getStripeClient/getResendClient
- [H2] Added comprehensive unit tests for services (14 new tests in services.test.ts)
- All 52 tests passing (27 API + 25 web)

**Documentation Clarifications:**
- Task 6.2 interface: Actual implementation uses `updateResult` instead of `updateStage` (DB schema has no stage field)
- Task 7.2 interface: ResultService doesn't need `create` method as results are derived from uploads table

### File List

| File | Action |
|------|--------|
| `packages/api/src/lib/errors.ts` | Modified |
| `packages/api/src/lib/errors.test.ts` | Modified |
| `packages/api/src/lib/env.ts` | Modified (+ APP_URL, PRODUCT_PRICE_CENTS, FROM_EMAIL) |
| `packages/api/src/services/GeminiService.ts` | Created |
| `packages/api/src/services/R2Service.ts` | Modified |
| `packages/api/src/services/StripeService.ts` | Created (+ retry/timeout) |
| `packages/api/src/services/ResendService.ts` | Created (+ retry/timeout) |
| `packages/api/src/services/UploadService.ts` | Created |
| `packages/api/src/services/ResultService.ts` | Created |
| `packages/api/src/services/index.ts` | Modified |
| `packages/api/src/services/services.test.ts` | Created (14 tests) |
| `packages/api/src/routes/storage.ts` | Modified |
| `packages/api/package.json` | Modified |

---

## Change Log

| Date | Change |
|------|--------|
| 2024-12-21 | Story created with comprehensive context |
| 2024-12-21 | Implementation complete - all tasks done, 38 tests passing, status → review |
| 2024-12-21 | Code review: Fixed 8 issues (3 HIGH, 5 MEDIUM), 52 tests passing, status → done |

---

## References

- [Source: architecture.md#Effect-Architecture-Patterns] - Complete Effect patterns
- [Source: architecture.md#Effect-Service-Pattern] - Service template
- [Source: architecture.md#Effect-Errors-Typed] - Error patterns
- [Source: epics.md#Story-1.9] - Acceptance criteria
- [Effect Docs](https://effect.website/)
