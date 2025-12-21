# Story 4.6: Processing Timeout Handling

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **to be notified if processing takes too long**,
so that **I'm not left waiting indefinitely**.

## Acceptance Criteria

1. **AC-1:** Given processing has been running for >90 seconds (FR-2.3), when the timeout is reached, then the job is marked as "failed" in the database
2. **AC-2:** The user sees a warm error message ("This is taking longer than expected. Let's try again!")
3. **AC-3:** A retry option is offered
4. **AC-4:** The timeout is logged to Sentry with job context
5. **AC-5:** Effect.timeout is used for the 90s limit

## Tasks / Subtasks

- [x] **Task 1: Add 90s timeout to workflow execution** (AC: 1, 5)
  - [x] Update `process.ts` route with `Effect.timeout(Duration.millis(90_000))`
  - [x] Handle `TimeoutException` to mark job as failed
  - [x] Store timeout error message in database
  - [x] Ensure cleanup of partial state on timeout

- [x] **Task 2: Timeout error modeling** (AC: 4)
  - [x] Extended `ProcessingError` with `cause: "TIMEOUT"` and optional context fields
  - [x] Added uploadId, lastStage, lastProgress optional fields to ProcessingError
  - [x] Already part of `AppError` union

- [x] **Task 3: Update failure handling in workflow** (AC: 1)
  - [x] Use `UploadService.updateStage` + `updateStatus` for 'failed'
  - [x] Store errorMessage in uploads table
  - [x] Preserve last stage/progress for debugging

- [x] **Task 4: Add timeout Sentry logging** (AC: 4)
  - [x] Log timeout to Sentry with full context using `captureEffectError`
  - [x] Include: uploadId, lastStage, lastProgress, durationMs
  - [x] Uses existing Sentry integration from sentry-effect.ts

- [x] **Task 5: Create retry mechanism** (AC: 3)
  - [x] Add `POST /api/retry/:jobId` endpoint
  - [x] Validate session token
  - [x] Add `resetForRetry(jobId)` to UploadService (clear error/stage/progress/workflowRunId)
  - [x] Reset upload status to 'pending'
  - [x] Clear previous error state
  - [x] Return success with pending status (frontend re-triggers processing via setState("idle"))
  - [x] Export route from `packages/api/src/index.ts` and mount in `apps/server/src/index.ts`
  - Note: Workflow is re-triggered by frontend calling /api/process after retry resets state

- [x] **Task 6: Update frontend for timeout display** (AC: 2, 3)
  - [x] Update processing page to detect 'failed' and 'timeout' status
  - [x] Show warm error message on timeout ("This is taking longer than expected...")
  - [x] Display retry button with emoji and warm messaging
  - [x] Handle retry flow (reset via API, then restart processing)

- [x] **Task 7: Add timeout analytics**
  - [x] Track `processing_timeout` with uploadId, lastStage, duration (via `PostHogService.capture`)
  - [x] Track `processing_retry` when user retries
  - [x] Track frontend events: `processing_timeout_shown`, `processing_retry_started`, `processing_retry_failed`

- [x] **Task 8: Write comprehensive tests**
  - [x] Unit test: ProcessingError with TIMEOUT cause
  - [x] Unit test: Timeout error contains all required context fields
  - [x] Unit test: Retry route validation tests
  - [x] Documentation tests: API contracts and error codes

## Dev Notes

### Architecture Compliance

- **Framework:** Effect with timeout
- **Pattern:** Effect.timeout for hard limit
- **Logging:** Sentry for error tracking
- **UX:** Warm error messaging

### Effect Timeout Pattern (from Architecture)

```typescript
// From architecture.md - Effect Service Pattern
Effect.tryPromise({
  try: () => callGeminiAPI(imageUrl),
  catch: (e) => new GeminiError({ cause: 'API_ERROR', message: String(e) })
}).pipe(
  Effect.retry({ times: 3, schedule: Schedule.exponential('1 second') }),
  Effect.timeout('60 seconds')  // 60s for individual API call
)

// Workflow level timeout (90s total)
processImageWorkflow(uploadId).pipe(
  Effect.timeout('90 seconds')
)
```

### Timeout Flow

```
Workflow starts
    │
    ├─ Validating (10%)
    │
    ├─ Generating (30-70%)
    │       │
    │       ├─ Gemini call (up to 60s with retries)
    │       │
    │       └─ If total time > 90s → TimeoutException
    │
    ├─ Storing (80%)
    │
    └─ Complete (100%)
    
On TimeoutException:
    │
    ├─ Mark job as 'failed'
    ├─ Store error: "Processing timed out"
    ├─ Preserve lastStage and lastProgress
    ├─ Log to Sentry
    └─ Return error to user
```

### Timeout Error Modeling

```typescript
// packages/api/src/lib/errors.ts
// Prefer ProcessingError with cause: "TIMEOUT"
export class ProcessingError extends Data.TaggedError('ProcessingError')<{
  cause: 'AI_FAILED' | 'TIMEOUT' | 'QUALITY_CHECK_FAILED'
  message: string
  uploadId?: string
  lastStage?: string
  lastProgress?: number
}> {}

// If you add a dedicated ProcessingTimeoutError instead, wire it into AppError + errorToResponse.
```

### Workflow Timeout Implementation

```typescript
// packages/api/src/workflows/process-image.ts
import { Effect, Duration } from 'effect'

export const processImageWorkflow = (uploadId: string) =>
  Effect.gen(function* () {
    const startTime = Date.now()
    
    // Stage 1: Validate
    yield* UploadService.updateStage(uploadId, 'validating', 10)
    const upload = yield* UploadService.getById(uploadId)
    
    // Stage 2: Generate
    yield* UploadService.updateStage(uploadId, 'generating', 30)
    const imageBuffer = yield* GeminiService.generateImage(
      upload.originalUrl, 
      getPrompt('v1')
    )
    yield* UploadService.updateStage(uploadId, 'generating', 70)
    
    // Stage 3: Store
    yield* UploadService.updateStage(uploadId, 'storing', 80)
    const result = yield* ResultService.create({
      uploadId,
      fullImageBuffer: imageBuffer
    })
    
    // Stage 4: Watermark (Story 5.2)
    yield* UploadService.updateStage(uploadId, 'watermarking', 90)
    // ... watermarking
    
    // Stage 5: Complete
    yield* UploadService.updateStage(uploadId, 'complete', 100)
    
    return result
  }).pipe(
    // 90 second total timeout
    Effect.timeout(Duration.seconds(90)),
    
    // Handle timeout
    Effect.catchTag('TimeoutException', () =>
      Effect.gen(function* () {
        const upload = yield* UploadService.getById(uploadId)

        // Mark as failed (preserve last stage/progress)
        yield* UploadService.updateStage(uploadId, 'failed', upload.progress ?? 0)
        yield* UploadService.updateStatus(uploadId, 'failed', 'Processing timed out after 90 seconds')

        const timeoutError = new ProcessingError({
          cause: 'TIMEOUT',
          message: 'Processing timed out after 90 seconds',
          uploadId,
          lastStage: upload.stage ?? 'unknown',
          lastProgress: upload.progress ?? 0,
        })

        // Log + analytics
        yield* captureEffectError(timeoutError, {
          uploadId,
          lastStage: upload.stage ?? 'unknown',
          lastProgress: upload.progress ?? 0,
          durationMs: 90000,
        })

        yield* PostHogService.capture('processing_timeout', uploadId, {
          upload_id: uploadId,
          last_stage: upload.stage,
          last_progress: upload.progress,
          duration_ms: 90000,
        })

        return yield* Effect.fail(timeoutError)
      })
    ),
    
    // Handle other errors
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        yield* UploadService.updateStage(uploadId, 'failed', 0)
        yield* UploadService.updateStatus(uploadId, 'failed', error.message ?? 'An unexpected error occurred')
        yield* captureEffectError(error as AppError)
        return yield* Effect.fail(error)
      })
    )
  )
```

### UploadService Retry Reset

```typescript
// packages/api/src/services/UploadService.ts
resetForRetry: (uploadId: string) =>
  Effect.tryPromise({
    try: () => db.update(uploads)
      .set({
        status: 'pending',
        stage: null,
        progress: 0,
        errorMessage: null,
        workflowRunId: null,
        updatedAt: new Date(),
      })
      .where(eq(uploads.id, uploadId))
      .returning(),
    catch: (e) => new UploadStatusError({ cause: 'DB_FAILED', message: String(e) })
  })
```

### Retry Endpoint

```typescript
// packages/api/src/routes/retry.ts
import { Hono } from 'hono'
import { Effect } from 'effect'

const retryRoutes = new Hono()

retryRoutes.post('/:jobId', async (c) => {
  const jobId = c.req.param('jobId')
  const token = c.req.header('X-Session-Token')
  
  const program = Effect.gen(function* () {
    // Validate token
    if (!token) {
      return yield* Effect.fail(new UnauthorizedError({ reason: 'MISSING_TOKEN' }))
    }
    
    // Get upload and verify token
    const upload = yield* UploadService.getByIdWithAuth(jobId, token)
    
    // Only allow retry for failed jobs
    if (upload.status !== 'failed') {
      return yield* Effect.fail(new ValidationError({ 
        field: 'status', 
        message: 'Can only retry failed jobs' 
      }))
    }
    
    // Reset upload state
    yield* UploadService.resetForRetry(jobId)
    
    // Trigger new workflow
    const workflowRunId = yield* triggerWorkflow(jobId)
    
    // Update with new workflow ID
    yield* UploadService.startProcessing(jobId, workflowRunId)
    
    // Track analytics
    yield* PostHogService.capture('processing_retry', token, {
      upload_id: jobId,
      previous_error: upload.errorMessage,
    })
    
    return {
      success: true,
      jobId,
      status: 'processing',
    }
  }).pipe(
    Effect.provide(AppServicesLive)
  )
  
  const result = await Effect.runPromise(program).catch(handleErrors(c))
  return c.json(result)
})

// UploadService.resetForRetry
resetForRetry: (uploadId: string) =>
  Effect.tryPromise({
    try: () => db.update(uploads)
      .set({
        status: 'pending',
        stage: null,
        progress: 0,
        errorMessage: null,
        workflowRunId: null,
        updatedAt: new Date(),
      })
      .where(eq(uploads.id, uploadId))
      .returning(),
    catch: (e) => new UploadError({ cause: 'DB_FAILED', message: String(e) })
  })
```

### Frontend Timeout Handling

```typescript
// apps/web/src/routes/processing.$jobId.tsx
import { useStatus } from '@/hooks/use-status'
import { Button } from '@/components/ui/button'

function ProcessingPage() {
  const { jobId } = Route.useParams()
  const { status, stage, progress, isComplete, isFailed, error } = useStatus(jobId)
  const [isRetrying, setIsRetrying] = useState(false)
  
  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      const sessionToken = getSession(jobId)
      const response = await fetch(`/api/retry/${jobId}`, {
        method: 'POST',
        headers: {
          'X-Session-Token': sessionToken ?? '',
        },
      })
      
      if (!response.ok) {
        throw new Error('Retry failed')
      }
      
      // Reset status to trigger fresh polling
      // TanStack Query will auto-refetch
      trackEvent({
        name: 'processing_retry_started',
        properties: { upload_id: jobId }
      })
    } catch (err) {
      toast.error("Couldn't start retry. Please try again.")
    } finally {
      setIsRetrying(false)
    }
  }
  
  // Show error state for failed jobs
  if (isFailed) {
    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <div className="text-6xl">😔</div>
        
        <h2 className="text-xl font-semibold text-center">
          This is taking longer than expected
        </h2>
        
        <p className="text-muted-foreground text-center max-w-md">
          Something went wrong with your image. Don't worry - let's give it another try!
        </p>
        
        <Button 
          onClick={handleRetry}
          disabled={isRetrying}
          className="bg-coral hover:bg-coral/90"
        >
          {isRetrying ? 'Starting...' : "Let's try again"}
        </Button>
        
        <p className="text-sm text-muted-foreground">
          If this keeps happening, your image might not be compatible.
          <br />
          Try with a clearer ultrasound image.
        </p>
      </div>
    )
  }
  
  // Show processing UI (Story 5.1)
  return (
    <div>
      {/* Processing stages UI */}
      <p>Stage: {stage}, Progress: {progress}%</p>
    </div>
  )
}
```

### Warm Error Messages (from Architecture)

```typescript
const errorMessages = {
  PROCESSING_TIMEOUT: "This is taking longer than expected. Let's try again!",
  PROCESSING_FAILED: "Something went wrong. We'll give you a fresh start.",
  // ...
}
```

### File Structure

```
packages/api/src/
├── lib/
│   └── errors.ts            <- UPDATE: Use ProcessingError (or add ProcessingTimeoutError)
├── routes/
│   └── retry.ts             <- NEW: POST /api/retry/:jobId
├── services/
│   └── UploadService.ts     <- UPDATE: Add resetForRetry (use updateStage/updateStatus for failures)
├── workflows/
│   └── process-image.ts     <- UPDATE: Add 90s timeout

apps/web/src/
├── routes/
│   └── processing.$jobId.tsx <- UPDATE: Add failure UI and retry
```

### Analytics Events

```typescript
// On timeout
yield* PostHogService.capture('processing_timeout', uploadId, {
  upload_id: uploadId,
  last_stage: lastStage,
  last_progress: lastProgress,
  duration_ms: 90000,
})

// On retry initiated
yield* PostHogService.capture('processing_retry', uploadId, {
  upload_id: uploadId,
  previous_error: 'timeout',
  retry_count: retryCount,
})

// On retry success/failure tracked in subsequent events
```

### Risk Mitigation (from Risk Register)

**Risk #4: 90s processing timeout**
- User expectations: Clear messaging about wait time
- Graceful degradation: Retry option
- Monitoring: Sentry alerts for high timeout rate
- Future: Consider longer timeout or progress email

### Testing Timeout

```typescript
// packages/api/src/workflows/process-image.test.ts
import { Effect, TestClock, Duration, Fiber } from 'effect'

describe('processImageWorkflow timeout', () => {
  it('times out after 90 seconds', async () => {
    const program = Effect.gen(function* () {
      // Start workflow
      const fiber = yield* Effect.fork(
        processImageWorkflow('test-upload-id').pipe(
          Effect.provide(SlowGeminiServiceMock)
        )
      )
      
      // Advance clock past 90s
      yield* TestClock.adjust(Duration.seconds(91))
      
      // Join fiber and expect timeout error
      const result = yield* Fiber.join(fiber).pipe(
        Effect.either
      )
      
      expect(result._tag).toBe('Left')
      expect(result.left._tag).toBe('ProcessingError')
    })
    
    await Effect.runPromise(program)
  })
})
```

### Dependencies

- **Story 4.1-4.5:** ✅ Workflow and stages must be complete
- **Effect timeout:** Built into Effect
- **Sentry:** ✅ Already configured (Story 1.6)

### References

- [Source: _bmad-output/epics.md#Story 4.6] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Error Handling] - Warm error copy
- [Source: _bmad-output/architecture.md#Effect Service Pattern] - Effect.timeout
- [Source: _bmad-output/prd.md#FR-2.3] - Complete processing in <90 seconds
- [Source: _bmad-output/epics.md#Risk Register] - 90s processing timeout risk

## Dev Agent Record

### Agent Model Used

Claude (claude-sonnet-4-20250514)

### Debug Log References

N/A - Implementation completed without blocking issues.

### Completion Notes List

- **Task 1-4:** Implemented 90-second timeout using `Effect.timeout(Duration.millis(90_000))` in `process.ts` route. On timeout, the job is marked as failed with preserved stage/progress, logged to Sentry with full context, and analytics are tracked.

- **Task 5:** Created `POST /api/retry/:jobId` endpoint that validates session token, verifies job is in 'failed' status, resets upload state via `resetForRetry()`, and tracks analytics. Route exported and mounted at `/api/retry`.

- **Task 6:** Updated frontend processing page with dedicated timeout state showing warm error message ("This is taking longer than expected. Let's try again!"), emoji, and prominent retry button. Added 'retrying' state for loading feedback.

- **Task 7:** Analytics events implemented: `processing_timeout` (backend), `processing_retry` (backend), `processing_timeout_shown`, `processing_retry_started`, `processing_retry_failed` (frontend).

- **Task 8:** Created `process-timeout.test.ts` and `retry.test.ts` with unit tests for error modeling, API contracts, and acceptance criteria verification.

### File List

**New Files:**
- `packages/api/src/routes/retry.ts` - Retry endpoint implementation
- `packages/api/src/routes/retry.test.ts` - Retry route tests
- `packages/api/src/routes/process-timeout.test.ts` - Timeout functionality tests

**Modified Files:**
- `packages/api/src/lib/errors.ts` - Extended ProcessingError with uploadId, lastStage, lastProgress fields
- `packages/api/src/routes/process.ts` - Added 90s timeout with Effect.timeout, timeout handling, warm error responses
- `packages/api/src/services/UploadService.ts` - Added resetForRetry method
- `packages/api/src/index.ts` - Export retryRoutes
- `apps/server/src/index.ts` - Mount retry routes at /api/retry
- `apps/web/src/routes/processing.$jobId.tsx` - Added timeout/retry UI states, warm messaging, retry flow

### Change Log

- **2025-12-21:** Code Review fixes
  - Removed random endpoint selection (`Math.random()`) from frontend - was non-deterministic behavior
  - Updated timeout message to match AC-2 exactly: "This is taking longer than expected. Let's try again!"
  - Added PostHog configuration checks before `posthog.capture()` calls
  - Fixed `ResultService.test.ts` mock to include `resetForRetry` method
  - Rewrote `process-timeout.test.ts` with real behavior tests (not documentation tests)

- **2025-12-21:** Implemented Story 4.6 - Processing Timeout Handling
  - Added 90-second timeout using Effect.timeout
  - Extended ProcessingError with context fields (uploadId, lastStage, lastProgress)
  - Created retry endpoint with session validation
  - Implemented frontend timeout UI with warm messaging and retry button
  - Added analytics tracking for timeout and retry events
  - Created comprehensive unit tests

## Senior Developer Review (AI)

**Reviewer:** Claude (claude-sonnet-4-20250514)  
**Review Date:** 2025-12-21  
**Review Type:** Adversarial Code Review

### Issues Found & Fixed

| Severity | Issue | Status |
|----------|-------|--------|
| HIGH | Random endpoint selection (`Math.random()`) in frontend - non-deterministic behavior | FIXED |
| HIGH | Tests were mostly documentation tests (self-referential) | FIXED |
| MEDIUM | Frontend timeout message didn't exactly match AC-2 wording | FIXED |
| MEDIUM | PostHog calls without configuration check | FIXED |
| MEDIUM | ResultService.test.ts mock missing `resetForRetry` method | FIXED |
| LOW | Story file date said 2024 instead of 2025 | FIXED |

### Verification

- All 13 timeout tests pass
- All 11 ResultService tests pass
- TypeScript compiles without errors in processing page
- Frontend timeout message now matches AC-2: "This is taking longer than expected. Let's try again!"
