# Story 4.1: Workflow Job Definition

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **a durable workflow defined for image processing**,
so that **long-running AI jobs survive function timeouts**.

## Acceptance Criteria

1. **AC-1:** Given an upload with status "pending", when the process endpoint is called, then a Workflow job is created (useworkflow.dev)
2. **AC-2:** The Workflow run ID is stored in the database (`workflowRunId` column in uploads table)
3. **AC-3:** The upload status changes to "processing"
4. **AC-4:** The endpoint returns immediately (<2s fire-and-forget pattern)
5. **AC-5:** `processing_started` analytics event is fired (server-side)

## Tasks / Subtasks

- [ ] **Task 1: Install and configure Workflow SDK** (AC: 1)
  - [ ] Install `@useworkflow/client` (or the officially recommended SDK)
  - [ ] Create `packages/api/src/lib/workflow.ts` for Workflow client initialization
  - [ ] Add `WORKFLOW_API_KEY` and `WORKFLOW_ENDPOINT` to `packages/api/src/lib/env.ts` + `.env.example`
  - [ ] Validate Workflow credentials on startup (warn in dev, fail in prod)
  - [ ] Export typed workflow client

- [ ] **Task 2: Create process-image workflow definition** (AC: 1)
  - [ ] Create `packages/api/src/workflows/process-image.ts`
  - [ ] Define workflow with stages: validating → generating → storing → watermarking → complete
  - [ ] Accept `uploadId` as workflow input (jobId = uploadId for all downstream routes)
  - [ ] Return `resultId` on completion
  - [ ] Use Effect for each stage and run Effects at the boundary (provide services via `AppServicesLive`)

- [ ] **Task 3: Create POST /api/process endpoint** (AC: 1, 2, 3, 4)
  - [ ] Create `packages/api/src/routes/process.ts`
  - [ ] Accept `{ uploadId }` in request body
  - [ ] Validate session token (X-Session-Token header)
  - [ ] Verify upload exists and status is "pending"
  - [ ] Trigger Workflow job asynchronously (fire-and-forget)
  - [ ] Update upload status to "processing" and store `workflowRunId`
  - [ ] Return `{ jobId: uploadId, status: "processing", workflowRunId }` immediately
  - [ ] Export route from `packages/api/src/index.ts` and mount in `apps/server/src/index.ts`

- [ ] **Task 4: Update UploadService for processing** (AC: 2, 3)
  - [ ] Add `startProcessing(uploadId: string, workflowRunId: string)` method
  - [ ] Update status to "processing"
  - [ ] Store `workflowRunId` in database
  - [ ] Add typed error for "already processing" scenario and wire into `AppError` + `errorToResponse`

- [ ] **Task 5: Add processing analytics** (AC: 5)
  - [ ] Fire `processing_started` via `PostHogService.capture` (server-side)
  - [ ] Include `uploadId`, `workflowRunId`

- [ ] **Task 6: Create processing route on frontend** (AC: 4)
  - [ ] Update `/processing/$jobId` route to call POST /api/process on mount
  - [ ] Handle "already processing" response gracefully
  - [ ] Show appropriate UI during process initiation
  - [ ] Handle errors with retry option

- [ ] **Task 7: Write comprehensive tests**
  - [ ] Unit test: Workflow job is triggered on process call
  - [ ] Unit test: Status changes from pending to processing
  - [ ] Unit test: workflowRunId is stored correctly
  - [ ] Unit test: Already processing uploads return 409
  - [ ] Unit test: Invalid session token returns 401
  - [ ] Integration test: Full process trigger flow

## Dev Notes

### Architecture Compliance

- **Framework:** Hono + Effect services
- **Durable Execution:** Workflow (useworkflow.dev) - CRITICAL for 60-90s AI processing
- **Pattern:** Fire-and-forget - endpoint returns immediately, workflow runs async
- **Database:** Drizzle ORM with uploads table

### Why Workflow (useworkflow.dev)?

From architecture.md:
- Vercel Pro has 60s function timeout
- Gemini Imagen 3 processing takes 60-90s
- Workflow provides durable execution that survives timeouts
- Fire-and-forget pattern: POST /api/process returns in <2s

### Workflow Integration Pattern

```typescript
// packages/api/src/lib/workflow.ts
import { Workflow } from '@useworkflow/client'

export const workflowClient = new Workflow({
  apiKey: env.WORKFLOW_API_KEY,
  endpoint: env.WORKFLOW_ENDPOINT,
})

// Define workflow
export const processImageWorkflow = workflowClient.define({
  name: 'process-image',
  handler: async (input: { uploadId: string }) => {
    // Stages implemented in subsequent stories
    // 4.2: Call Gemini API
    // 4.3: Retry logic
    // 4.4: Store results in R2
    // 4.5: Update progress
    // 4.6: Handle timeouts
  }
})
```

### Fire-and-Forget Pattern (from Architecture)

```
Frontend calls POST /api/process
       │
       ▼
┌─────────────────┐
│ Validate token  │
│ Check status    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Trigger Workflow│
│ (async, no wait)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update DB:      │
│ status=processing│
│ workflowRunId   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return in <2s:  │
│ { jobId,        │
│   status }      │
└─────────────────┘
         │
         ▼
Frontend polls GET /api/status/:jobId (Story 4.5)
```

### API Endpoint Design

```typescript
// POST /api/process
// Headers: X-Session-Token: {token}
// Request:
{
  uploadId: string
}

// Response (immediate):
{
  success: true,
  jobId: string,       // Same as uploadId
  status: "processing",
  workflowRunId: string
}

// Error responses:
// 401: Invalid or missing session token
// 404: Upload not found
// 409: Upload already processing or completed
// 500: Workflow trigger failed
```

### Database Schema Reference

```typescript
// packages/db/src/schema/index.ts - Already exists
export const uploads = pgTable("uploads", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  originalUrl: text("original_url").notNull(),
  status: text("status", { enum: ['pending', 'processing', 'completed', 'failed'] }),
  workflowRunId: text("workflow_run_id"),  // ← Store workflow job ID here
  // ... other fields
})

### Important Clarifications

- `jobId` in API responses should be the same as `uploadId` (consistent with existing upload flow).
- `originalUrl` stored on uploads is an **R2 key**, not a public URL; downstream workflow stages must resolve to a signed URL via `R2Service` before calling external APIs.
```

### UploadService Updates

```typescript
// packages/api/src/services/UploadService.ts
interface UploadService {
  // Existing methods...
  
  // NEW method for this story:
  startProcessing: (uploadId: string, workflowRunId: string) => 
    Effect.Effect<Upload, NotFoundError | AlreadyProcessingError>
}

// Implementation:
startProcessing: (uploadId, workflowRunId) =>
  Effect.gen(function* () {
    const upload = yield* getById(uploadId)
    
    if (upload.status !== 'pending') {
      return yield* Effect.fail(new AlreadyProcessingError({ uploadId, currentStatus: upload.status }))
    }
    
    const [updated] = yield* Effect.tryPromise(() =>
      db.update(uploads)
        .set({ 
          status: 'processing',
          workflowRunId,
          updatedAt: new Date()
        })
        .where(eq(uploads.id, uploadId))
        .returning()
    )
    
    return updated
  })
```

### New Error Type

```typescript
// packages/api/src/lib/errors.ts
export class AlreadyProcessingError extends Data.TaggedError('AlreadyProcessingError')<{
  uploadId: string
  currentStatus: string
}> {}
```

### Environment Variables

Add to `.env.example` and env schema:
```bash
WORKFLOW_API_KEY=wf_...
WORKFLOW_ENDPOINT=https://api.useworkflow.dev
```

```typescript
// packages/api/src/lib/env.ts - Add to schema
WORKFLOW_API_KEY: z.string().startsWith('wf_'),
WORKFLOW_ENDPOINT: z.string().url().optional().default('https://api.useworkflow.dev'),
```

### Frontend Processing Route

```typescript
// apps/web/src/routes/processing.$jobId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { getSession } from '@/lib/session'

export const Route = createFileRoute('/processing/$jobId')({
  component: ProcessingPage,
})

function ProcessingPage() {
  const { jobId } = Route.useParams()
  const [hasStarted, setHasStarted] = useState(false)
  
  useEffect(() => {
    const startProcessing = async () => {
      if (hasStarted) return
      
      const sessionToken = getSession(jobId)
      if (!sessionToken) {
        // Handle missing session - redirect to home
        return
      }
      
      try {
        const response = await fetch('/api/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-Token': sessionToken,
          },
          body: JSON.stringify({ uploadId: jobId }),
        })
        
        if (response.status === 409) {
          // Already processing - that's fine, just show status
          setHasStarted(true)
          return
        }
        
        if (!response.ok) {
          throw new Error('Failed to start processing')
        }
        
        setHasStarted(true)
      } catch (error) {
        // Handle error
      }
    }
    
    startProcessing()
  }, [jobId, hasStarted])
  
  // Render processing UI (Story 5.1)
  return <div>Processing {jobId}...</div>
}
```

### Analytics Events

```typescript
// Server-side (in process route)
yield* PostHogService.capture('processing_started', sessionToken, {
  upload_id: uploadId,
  workflow_run_id: workflowRunId,
})

// Client-side (in processing page)
trackEvent({
  name: 'processing_started',
  properties: {
    upload_id: jobId,
  }
})
```

### File Structure

```
packages/api/src/
├── lib/
│   ├── workflow.ts          <- NEW: Workflow client
│   └── env.ts               <- UPDATE: Add WORKFLOW_* vars
├── routes/
│   └── process.ts           <- NEW: POST /api/process
├── services/
│   └── UploadService.ts     <- UPDATE: Add startProcessing
├── workflows/
│   └── process-image.ts     <- NEW: Workflow definition (scaffold)

apps/web/src/
├── routes/
│   └── processing.$jobId.tsx <- UPDATE: Add process trigger
├── hooks/
│   └── use-analytics.ts     <- UPDATE: Add processing_started event
```

### Dependencies

- **Story 3.6 (Session Token):** ✅ Session tokens and DB records exist
- **useworkflow.dev SDK:** Need to install and configure
- **Database schema:** workflowRunId column already exists

### What This Enables

- Story 4.2: Gemini API call inside workflow
- Story 4.3: Retry logic within workflow
- Story 4.4: Result storage at end of workflow
- Story 4.5: Progress updates during workflow execution
- Story 4.6: Timeout handling for workflow

### useworkflow.dev References

Check latest SDK documentation:
```bash
# Installation (verify latest version)
bun add @useworkflow/client
```

Workflow dashboard: https://app.useworkflow.dev (for monitoring jobs)

### References

- [Source: _bmad-output/epics.md#Story 4.1] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Durable Execution] - Workflow pattern
- [Source: _bmad-output/architecture.md#API Design] - POST /api/process endpoint
- [Source: _bmad-output/architecture.md#Party Mode Enhancements] - Fire-and-forget pattern
- [Source: packages/db/src/schema/index.ts] - workflowRunId column

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
