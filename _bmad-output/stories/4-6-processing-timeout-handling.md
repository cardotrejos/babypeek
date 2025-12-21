# Story 4.6: Processing Timeout Handling

Status: ready-for-dev

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

- [ ] **Task 1: Add 90s timeout to workflow execution** (AC: 1, 5)
  - [ ] Update `process-image.ts` workflow with `Effect.timeout('90 seconds')`
  - [ ] Handle `TimeoutException` to mark job as failed
  - [ ] Store timeout error message in database
  - [ ] Ensure cleanup of partial state on timeout

- [ ] **Task 2: Timeout error modeling** (AC: 4)
  - [ ] Prefer reusing `ProcessingError` with `cause: "TIMEOUT"` **or** add `ProcessingTimeoutError` if extra context is needed
  - [ ] If adding a new error: wire into `AppError` union and `errorToResponse`
  - [ ] Include uploadId, lastStage, lastProgress in error context

- [ ] **Task 3: Update failure handling in workflow** (AC: 1)
  - [ ] Use `UploadService.updateStage` + `updateStatus` for 'failed'
  - [ ] Store errorMessage in uploads table
  - [ ] Preserve last stage/progress for debugging

- [ ] **Task 4: Add timeout Sentry logging** (AC: 4)
  - [ ] Log timeout to Sentry with full context
  - [ ] Include: uploadId, lastStage, lastProgress, totalDuration
  - [ ] Set appropriate severity level
  - [ ] Add tags for filtering

- [ ] **Task 5: Create retry mechanism** (AC: 3)
  - [ ] Add `POST /api/retry/:jobId` endpoint
  - [ ] Validate session token
  - [ ] Add `resetForRetry(jobId)` to UploadService (clear error/stage/progress/workflowRunId)
  - [ ] Reset upload status to 'pending'
  - [ ] Clear previous error state
  - [ ] Trigger new workflow
  - [ ] Return new jobId or same if reusing
  - [ ] Export route from `packages/api/src/index.ts` and mount in `apps/server/src/index.ts`

- [ ] **Task 6: Update frontend for timeout display** (AC: 2, 3)
  - [ ] Update processing page to detect 'failed' status
  - [ ] Show warm error message on timeout
  - [ ] Display retry button
  - [ ] Handle retry flow (reset and restart)

- [ ] **Task 7: Add timeout analytics**
  - [ ] Track `processing_timeout` with uploadId, lastStage, duration (via `PostHogService.capture`)
  - [ ] Track `processing_retry` when user retries
  - [ ] Track retry success/failure

- [ ] **Task 8: Write comprehensive tests**
  - [ ] Unit test: Workflow times out after 90s
  - [ ] Unit test: Job marked as failed on timeout
  - [ ] Unit test: Sentry receives timeout event
  - [ ] Unit test: Retry resets state correctly
  - [ ] Integration test: Full timeout → retry flow

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
