# Story 4.5: Processing Status Updates

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to see real-time progress of my image processing**,
so that **I know something is happening during the wait**.

## Acceptance Criteria

1. **AC-1:** Given my image is being processed, when I poll GET /api/status/:jobId, then I receive the current stage (validating, generating, watermarking, complete)
2. **AC-2:** I receive progress percentage (0-100)
3. **AC-3:** The response includes resultId when complete
4. **AC-4:** Status updates are stored in the database (stage, progress columns)
5. **AC-5:** Polling interval is 2-3 seconds (frontend implementation)

## Tasks / Subtasks

- [ ] **Task 1: Add stage and progress columns to uploads table** (AC: 4)
  - [ ] Update schema with `stage` column (enum: validating, generating, storing, watermarking, complete, failed)
  - [ ] Add `progress` column (integer 0-100)
  - [ ] Run database migration
  - [ ] Update TypeScript types
  - [ ] Update `UploadStage` union in `packages/api/src/services/UploadService.ts`

- [ ] **Task 2: Create GET /api/status/:jobId endpoint** (AC: 1, 2, 3)
  - [ ] Create `packages/api/src/routes/status.ts`
  - [ ] Accept jobId as path parameter
  - [ ] Validate session token (X-Session-Token header)
  - [ ] Query upload record for current stage and progress (add `getByIdWithAuth` to UploadService if needed)
  - [ ] Include resultId if status is "completed"
  - [ ] Return error if upload not found
  - [ ] Export route from `packages/api/src/index.ts` and mount in `apps/server/src/index.ts`

- [ ] **Task 3: Update UploadService for stage tracking** (AC: 4)
  - [ ] Add `updateStage(uploadId, stage, progress)` method
  - [ ] Validate stage transitions (can't go backwards)
  - [ ] Update updatedAt timestamp on each change
  - [ ] Use a typed DB error (extend UploadError or add a new UploadStatusError)

- [ ] **Task 4: Update workflow to report progress** (AC: 1, 2, 4)
  - [ ] Update `process-image.ts` to call updateStage at each workflow step
  - [ ] Stage: validating (10%), generating (30-70%), storing (80%), watermarking (90%), complete (100%)
  - [ ] Handle errors by setting stage to "failed"

- [ ] **Task 5: Create useStatus hook for polling** (AC: 1, 2, 3, 5)
  - [ ] Create `apps/web/src/hooks/use-status.ts`
  - [ ] Use TanStack Query with refetchInterval
  - [ ] Poll every 2-3 seconds until complete/failed
  - [ ] Stop polling on completion
  - [ ] Return stage, progress, resultId, error

- [ ] **Task 6: Add status polling analytics**
  - [ ] Track `status_poll` with stage, progress
  - [ ] Track `status_complete` with total duration
  - [ ] Track `status_failed` with error info
  - [ ] Send via `PostHogService.capture`

- [ ] **Task 7: Write comprehensive tests**
  - [ ] Unit test: Status endpoint returns correct stage/progress
  - [ ] Unit test: Stage transitions are validated
  - [ ] Unit test: resultId included only when complete
  - [ ] Unit test: useStatus hook polls correctly
  - [ ] Integration test: Full polling flow

## Dev Notes

### Architecture Compliance

- **Framework:** Hono + Effect services (backend), TanStack Query (frontend)
- **Pattern:** Polling with TanStack Query refetchInterval
- **Database:** Drizzle ORM with stage/progress columns

### Workflow Progress Pattern (from Architecture)

```typescript
// Store processing stage in database for real-time UI progress:
status: 'pending' | 'processing' | 'completed' | 'failed'
stage: 'validating' | 'generating' | 'storing' | 'watermarking' | 'complete'
progress: integer // 0-100

// Status API response
GET /api/status/:jobId → { status, stage, progress, resultId? }
```

### Database Schema Update

```typescript
// packages/db/src/schema/index.ts
export const uploadStageValues = [
  'validating', 
  'generating', 
  'storing',
  'watermarking', 
  'complete', 
  'failed'
] as const

export const uploads = pgTable("uploads", {
  // ... existing fields
  status: text("status", { enum: uploadStatusValues }).default("pending").notNull(),
  stage: text("stage", { enum: uploadStageValues }),  // NEW
  progress: integer("progress").default(0),           // NEW
  // ...
})
```

Migration:
```sql
ALTER TABLE uploads ADD COLUMN stage TEXT;
ALTER TABLE uploads ADD COLUMN progress INTEGER DEFAULT 0;
```

### API Endpoint Design

```typescript
// GET /api/status/:jobId
// Headers: X-Session-Token: {token}

// Response (processing):
{
  success: true,
  status: "processing",
  stage: "generating",
  progress: 45,
  resultId: null,
  updatedAt: "2024-12-21T10:30:00Z"
}

// Response (complete):
{
  success: true,
  status: "completed",
  stage: "complete",
  progress: 100,
  resultId: "clx123...",
  updatedAt: "2024-12-21T10:31:30Z"
}

// Response (failed):
{
  success: true,
  status: "failed",
  stage: "failed",
  progress: 30,
  resultId: null,
  errorMessage: "Processing failed. Please try again.",
  updatedAt: "2024-12-21T10:31:00Z"
}

// Error responses:
// 401: Invalid or missing session token
// 404: Upload not found
```

### Status Route Implementation

```typescript
// packages/api/src/routes/status.ts
import { Hono } from 'hono'
import { Effect } from 'effect'
import { UploadService } from '../services/UploadService'
import { UnauthorizedError, NotFoundError } from '../lib/errors'

const statusRoutes = new Hono()

statusRoutes.get('/:jobId', async (c) => {
  const jobId = c.req.param('jobId')
  const token = c.req.header('X-Session-Token')
  
  const program = Effect.gen(function* () {
    // Validate token
    if (!token) {
      return yield* Effect.fail(new UnauthorizedError({ reason: 'MISSING_TOKEN' }))
    }
    
  // Get upload with session verification
  const upload = yield* UploadService.getByIdWithAuth(jobId, token)
    
    // Get result if completed
  let resultId = null
  if (upload.status === 'completed') {
    // If using a results table, resolve its id. Otherwise, return uploadId.
    resultId = upload.resultUrl ? upload.id : null
  }
    
    return {
      success: true,
      status: upload.status,
      stage: upload.stage,
      progress: upload.progress,
      resultId,
      updatedAt: upload.updatedAt,
    }
  }).pipe(
    Effect.provide(AppServicesLive)
  )
  
  const result = await Effect.runPromise(program).catch((e) => {
    if (e instanceof UnauthorizedError) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED' } }, 401)
    }
    if (e instanceof NotFoundError) {
      return c.json({ success: false, error: { code: 'NOT_FOUND' } }, 404)
    }
    throw e
  })
  
  return c.json(result)
})

export { statusRoutes }
```

### UploadService Stage Update

```typescript
// packages/api/src/services/UploadService.ts
updateStage: (uploadId: string, stage: UploadStage, progress: number) =>
  Effect.gen(function* () {
    // Validate progress bounds
    const clampedProgress = Math.max(0, Math.min(100, progress))
    
    const [updated] = yield* Effect.tryPromise({
      try: () => db.update(uploads)
        .set({ 
          stage,
          progress: clampedProgress,
          updatedAt: new Date(),
          // Auto-update status based on stage
          status: stage === 'complete' ? 'completed' 
               : stage === 'failed' ? 'failed' 
               : 'processing'
        })
        .where(eq(uploads.id, uploadId))
        .returning(),
      catch: (e) => new UploadStatusError({ cause: 'DB_FAILED', message: String(e) })
    })
    
    return updated
  })
```

### Workflow Stage Updates

```typescript
// packages/api/src/workflows/process-image.ts
export const processImageWorkflow = (uploadId: string) =>
  Effect.gen(function* () {
    // Stage 1: Validate (10%)
    yield* UploadService.updateStage(uploadId, 'validating', 10)
    const upload = yield* UploadService.getById(uploadId)
    
    // Stage 2: Generate with Gemini (30-70%)
    yield* UploadService.updateStage(uploadId, 'generating', 30)
    const imageBuffer = yield* GeminiService.generateImage(
      upload.originalUrl, 
      getPrompt('v1')
    )
    yield* UploadService.updateStage(uploadId, 'generating', 70)
    
    // Stage 3: Store in R2 (80%)
    yield* UploadService.updateStage(uploadId, 'storing', 80)
    const result = yield* ResultService.create({
      uploadId,
      fullImageBuffer: imageBuffer
    })
    
    // Stage 4: Watermark (90%) - Story 5.2
    yield* UploadService.updateStage(uploadId, 'watermarking', 90)
    // ... watermarking logic
    
    // Stage 5: Complete (100%)
    yield* UploadService.updateStage(uploadId, 'complete', 100)
    yield* UploadService.updateStatus(uploadId, 'completed')
    
    return result
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        // Mark as failed
        yield* UploadService.updateStage(uploadId, 'failed', 0)
        yield* UploadService.updateStatus(uploadId, 'failed')
        return yield* Effect.fail(error)
      })
    )
  )
```

### useStatus Hook (Frontend)

```typescript
// apps/web/src/hooks/use-status.ts
import { useQuery } from '@tanstack/react-query'
import { getSession } from '@/lib/session'

interface StatusResponse {
  success: boolean
  status: 'pending' | 'processing' | 'completed' | 'failed'
  stage: string
  progress: number
  resultId: string | null
  updatedAt: string
}

interface UseStatusResult {
  status: StatusResponse['status'] | null
  stage: string | null
  progress: number
  resultId: string | null
  isLoading: boolean
  isComplete: boolean
  isFailed: boolean
  error: Error | null
}

export function useStatus(jobId: string | null): UseStatusResult {
  const sessionToken = jobId ? getSession(jobId) : null
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['status', jobId],
    queryFn: async (): Promise<StatusResponse> => {
      if (!jobId || !sessionToken) {
        throw new Error('Missing job ID or session')
      }
      
      const response = await fetch(`/api/status/${jobId}`, {
        headers: {
          'X-Session-Token': sessionToken,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch status')
      }
      
      return response.json()
    },
    enabled: !!jobId && !!sessionToken,
    
    // Poll every 2.5 seconds until complete or failed
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false // Stop polling
      }
      return 2500 // 2.5 seconds
    },
    
    // Keep previous data while fetching
    placeholderData: (prev) => prev,
  })
  
  const isComplete = data?.status === 'completed'
  const isFailed = data?.status === 'failed'
  
  return {
    status: data?.status ?? null,
    stage: data?.stage ?? null,
    progress: data?.progress ?? 0,
    resultId: data?.resultId ?? null,
    isLoading,
    isComplete,
    isFailed,
    error: error as Error | null,
  }
}
```

### TanStack Query Pattern (from Architecture)

```typescript
// Poll status every 2s until complete
useQuery({
  queryKey: ['status', jobId],
  queryFn: () => api.status[jobId].get(),
  refetchInterval: (data) => 
    data?.status === 'completed' ? false : 2000,
});
```

### Stage-to-Progress Mapping

```
validating  →  10%
generating  →  30-70% (updates during Gemini call)
storing     →  80%
watermarking → 90%
complete    →  100%
failed      →  preserves last progress
```

### File Structure

```
packages/api/src/
├── routes/
│   └── status.ts            <- NEW: GET /api/status/:jobId
├── services/
│   └── UploadService.ts     <- UPDATE: Add updateStage method

packages/db/src/schema/
├── index.ts                 <- UPDATE: Add stage/progress columns

apps/web/src/
├── hooks/
│   ├── use-status.ts        <- NEW: Status polling hook
│   └── use-status.test.ts   <- NEW: Tests
```

### Analytics Events

```typescript
// On each poll (sample 10% to reduce volume)
if (Math.random() < 0.1) {
  yield* PostHogService.capture('status_poll', sessionToken, {
    upload_id: jobId,
    stage: data.stage,
    progress: data.progress,
  })
}

// On completion
yield* PostHogService.capture('status_complete', sessionToken, {
  upload_id: jobId,
  result_id: data.resultId,
  total_duration_ms: Date.now() - processingStartTime,
})

// On failure
yield* PostHogService.capture('status_failed', sessionToken, {
  upload_id: jobId,
  final_stage: data.stage,
  final_progress: data.progress,
})
```

### Dependencies

- **Story 4.1 (Workflow):** ✅ Workflow exists to update stages
- **Story 4.2-4.4:** ✅ Stages to track
- **TanStack Query:** ✅ Already configured
- **Session tokens:** ✅ From Story 3.6

### What This Enables

- Story 5.1: Processing status page uses useStatus
- Story 5.3: Reveal triggers when isComplete = true
- Story 5.7: Mobile session recovery can resume polling

### References

- [Source: _bmad-output/epics.md#Story 4.5] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Workflow Progress Pattern] - Stage tracking
- [Source: _bmad-output/architecture.md#Frontend State] - TanStack Query polling
- [Source: _bmad-output/architecture.md#API Design] - GET /api/status/:jobId

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
