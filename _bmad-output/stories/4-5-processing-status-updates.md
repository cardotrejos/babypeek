# Story 4.5: Processing Status Updates

Status: done

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

- [x] **Task 1: Add stage and progress columns to uploads table** (AC: 4)
  - [x] Update schema with `stage` column (enum: validating, generating, storing, watermarking, complete, failed)
  - [x] Add `progress` column (integer 0-100)
  - [x] Run database migration
  - [x] Update TypeScript types
  - [x] Update `UploadStage` union in `packages/api/src/services/UploadService.ts`

- [x] **Task 2: Create GET /api/status/:jobId endpoint** (AC: 1, 2, 3)
  - [x] Create `packages/api/src/routes/status.ts`
  - [x] Accept jobId as path parameter
  - [x] Validate session token (X-Session-Token header)
  - [x] Query upload record for current stage and progress (add `getByIdWithAuth` to UploadService if needed)
  - [x] Include resultId if status is "completed"
  - [x] Return error if upload not found
  - [x] Export route from `packages/api/src/index.ts` and mount in `apps/server/src/index.ts`

- [x] **Task 3: Update UploadService for stage tracking** (AC: 4)
  - [x] Add `updateStage(uploadId, stage, progress)` method
  - [x] Validate stage transitions (can't go backwards)
  - [x] Update updatedAt timestamp on each change
  - [x] Use a typed DB error (extend UploadError or add a new UploadStatusError)

- [x] **Task 4: Update workflow to report progress** (AC: 1, 2, 4)
  - [x] Update `process-image.ts` to call updateStage at each workflow step
  - [x] Stage: validating (10%), generating (30-70%), storing (80%), watermarking (90%), complete (100%)
  - [x] Handle errors by setting stage to "failed"

- [x] **Task 5: Create useStatus hook for polling** (AC: 1, 2, 3, 5)
  - [x] Create `apps/web/src/hooks/use-status.ts`
  - [x] Use TanStack Query with refetchInterval
  - [x] Poll every 2-3 seconds until complete/failed
  - [x] Stop polling on completion
  - [x] Return stage, progress, resultId, error

- [x] **Task 6: Add status polling analytics**
  - [x] Track `status_poll` with stage, progress
  - [x] Track `status_complete` with total duration
  - [x] Track `status_failed` with error info
  - [x] Send via `PostHogService.capture`

- [x] **Task 7: Write comprehensive tests**
  - [x] Unit test: Status endpoint returns correct stage/progress
  - [x] Unit test: Stage transitions are validated
  - [x] Unit test: resultId included only when complete
  - [x] Unit test: useStatus hook polls correctly
  - [ ] Integration test: Full polling flow (deferred - covered by e2e tests)

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

Claude 3.5 Sonnet (claude-sonnet-4-20250514)

### Debug Log References

None - implementation completed without blocking issues.

### Completion Notes List

- Added `stage` (enum) and `progress` (integer) columns to uploads table in schema
- Created `UploadStatusError` for typed DB errors on stage transitions
- Implemented `updateStage` method with stage transition validation (can only move forward, except to failed)
- Added `getByIdWithAuth` method for session-verified status polling
- Created GET /api/status/:jobId endpoint with proper session token authentication
- Updated process-image workflow to report stage progress at each step (10%, 30-70%, 80%, 90%, 100%)
- Created useStatus React hook with TanStack Query polling (2.5s interval)
- Added analytics tracking (status_poll, status_complete, status_failed) with 10% sampling for polls
- Added helper functions getStageLabel and getStageEmoji for UI display
- All tests passing (185 API tests, 270 web tests)

### Code Review Fixes Applied

1. **HIGH: Improved status endpoint tests** - Rewrote tests to actually test HTTP behavior with mocked UploadService instead of just testing mock objects
2. **MEDIUM: Marked integration test as incomplete** - Full polling integration test deferred to e2e test suite
3. **MEDIUM: Fixed error handling tests** - Added tests that verify fetch behavior for network errors and non-ok responses
4. **MEDIUM: Fixed useEffect analytics dependency** - Added `useCallback` wrapper for `trackEvent` to prevent unnecessary effect re-runs
5. **MEDIUM: Stage transition validation reviewed** - Current behavior (allowing stage skipping) is intentional for flexibility; workflow always calls stages in order
6. **LOW: Removed unused prevStatusRef** - Cleaned up unused ref variable
7. **LOW: Extracted magic number** - Added `POLL_SAMPLE_RATE` constant for poll sampling (value: 10)
8. **LOW: Error message format clarified** - `errorMessage` field in success responses is intentionally different from `error: { code, message }` in HTTP error responses (different purposes)

### File List

**New Files:**
- packages/api/src/routes/status.ts - GET /api/status/:jobId endpoint
- packages/api/src/routes/status.test.ts - Status endpoint unit tests (rewritten during code review)
- apps/web/src/hooks/use-status.ts - Status polling hook with TanStack Query
- apps/web/src/hooks/use-status.test.ts - useStatus hook unit tests
- packages/db/src/migrations/0000_nasty_korvac.sql - Database migration
- packages/db/src/migrations/meta/_journal.json - Drizzle migration journal
- packages/db/src/migrations/meta/0000_snapshot.json - Drizzle migration snapshot

**Modified Files:**
- packages/db/src/schema/index.ts - Added stage/progress columns and UploadStage type
- packages/api/src/lib/errors.ts - Added UploadStatusError
- packages/api/src/services/UploadService.ts - Added updateStage, getByIdWithAuth, stage validation
- packages/api/src/services/ResultService.test.ts - Updated mock for new UploadService methods
- packages/api/src/workflows/process-image.ts - Added updateStage calls at each workflow step
- packages/api/src/workflows/process-image-simple.ts - Added updateStage calls (simple workflow variant)
- packages/api/src/routes/process.ts - Minor adjustments for workflow integration
- packages/api/src/index.ts - Exported statusRoutes
- apps/server/src/index.ts - Mounted /api/status route
- apps/web/src/hooks/use-analytics.ts - Added status_poll, status_complete, status_failed events
- bun.lock - Updated dependencies
- _bmad-output/stories/sprint-status.yaml - Updated story status
