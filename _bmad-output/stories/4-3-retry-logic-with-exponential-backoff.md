# Story 4.3: Retry Logic with Exponential Backoff

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **system**,
I want **transient failures to be retried automatically**,
so that **temporary API issues don't cause user failures**.

## Acceptance Criteria

1. **AC-1:** Given a Gemini API call fails with a transient error, when the retry logic activates (FR-2.4), then the call is retried up to 3 times
2. **AC-2:** Backoff is exponential (1s, 2s, 4s) using Effect.retry with Schedule
3. **AC-3:** Non-transient errors (invalid image, content policy) fail immediately without retry
4. **AC-4:** All retries are logged to Sentry with context
5. **AC-5:** `gemini_retry` analytics event is fired on each retry

## Tasks / Subtasks

- [ ] **Task 1: Categorize Gemini errors for retry eligibility** (AC: 1, 3)
  - [ ] Prefer helper `isRetryableGeminiError` (no schema change) **or** add `retryable: boolean` to GeminiError
  - [ ] RATE_LIMITED: retryable
  - [ ] API_ERROR: retryable (network issues)
  - [ ] TIMEOUT: retryable
  - [ ] INVALID_IMAGE: not retryable
  - [ ] CONTENT_POLICY: not retryable

- [ ] **Task 2: Create retry schedule with exponential backoff** (AC: 2)
  - [ ] Create `packages/api/src/lib/retry.ts` with reusable retry schedules
  - [ ] Define `geminiRetrySchedule` using Effect.Schedule
  - [ ] Exponential backoff: 1s → 2s → 4s
  - [ ] Max 3 retries (4 total attempts)
  - [ ] Add jitter to prevent thundering herd

- [ ] **Task 3: Update GeminiService with retry logic** (AC: 1, 2, 3)
  - [ ] Wrap `generateImage` with `Effect.retry` using a `Schedule` + predicate (`Schedule.whileInput`)
  - [ ] Only retry on retryable errors (invalid image/content policy must fail immediately)
  - [ ] Preserve original error for final failure
  - [ ] Track attempt number in context

- [ ] **Task 4: Add Sentry logging for retries** (AC: 4)
  - [ ] Log each retry attempt as breadcrumb via `addEffectBreadcrumb` in `packages/api/src/lib/sentry-effect.ts`
  - [ ] Include: attempt number, error type, time since first attempt
  - [ ] Log final failure with all retry context
  - [ ] No PII in logs (uploadId is ok)

- [ ] **Task 5: Add retry analytics** (AC: 5)
  - [ ] Track `gemini_retry` event with: uploadId, attempt, errorType using `PostHogService.capture`
  - [ ] Track `gemini_exhausted` when all retries fail
  - [ ] Send to PostHog server-side

- [ ] **Task 6: Write comprehensive tests**
  - [ ] Unit test: Retryable errors trigger retry
  - [ ] Unit test: Non-retryable errors fail immediately
  - [ ] Unit test: Max 3 retries
  - [ ] Unit test: Backoff timing (1s, 2s, 4s)
  - [ ] Unit test: Success after retry returns result
  - [ ] Integration test: Retry flow end-to-end

## Dev Notes

### Architecture Compliance

- **Framework:** Effect with Schedule for retries
- **Pattern:** Effect.retry with exponential backoff
- **Logging:** Sentry breadcrumbs for retry tracking
- **Analytics:** PostHog for retry metrics
- **Timeout scope:** Treat 60s as **per-attempt** (Gemini call); enforce 90s total in Story 4.6 workflow timeout

### Effect Retry Pattern (from Architecture)

```typescript
// From architecture.md - Effect Service Pattern
const geminiRetrySchedule = Schedule.exponential("1 second").pipe(
  Schedule.intersect(Schedule.recurs(3)),
  Schedule.whileInput(isRetryableGeminiError)
)

Effect.tryPromise({
  try: () => callGeminiAPI(imageUrl),
  catch: (e) => new GeminiError({ cause: 'API_ERROR', message: String(e) })
}).pipe(
  Effect.retry(geminiRetrySchedule),
  Effect.timeout('60 seconds')
)
```

### Retry Schedule Implementation

```typescript
// packages/api/src/lib/retry.ts
import { Schedule, Duration, Effect } from 'effect'

/**
 * Exponential backoff schedule for Gemini API:
 * - 1st retry after 1s
 * - 2nd retry after 2s  
 * - 3rd retry after 4s
 * - Includes jitter (±10%) to prevent thundering herd
 */
export const geminiRetrySchedule = Schedule.exponential(Duration.seconds(1)).pipe(
  Schedule.jittered,
  Schedule.intersect(Schedule.recurs(3)), // Max 3 retries = 4 total attempts
  Schedule.whileInput(isRetryableGeminiError)
  // Optionally: Schedule.tapInput((error) => addEffectBreadcrumb(...) + PostHogService.capture(...))
)

// Alternative with explicit delays for testing
export const geminiRetryScheduleExact = Schedule.fromDelays(
  Duration.seconds(1),
  Duration.seconds(2),
  Duration.seconds(4)
)
```

### Error Classification

```typescript
// packages/api/src/lib/errors.ts - Update GeminiError
export class GeminiError extends Data.TaggedError('GeminiError')<{
  cause: 'RATE_LIMITED' | 'INVALID_IMAGE' | 'CONTENT_POLICY' | 'API_ERROR' | 'TIMEOUT'
  message: string
  originalError?: unknown
  attempt?: number    // Optional: track attempt
}> {}

// Helper function to determine retryability
export function isRetryableGeminiError(error: GeminiError): boolean {
  return error.cause === 'RATE_LIMITED' || 
         error.cause === 'API_ERROR' || 
         error.cause === 'TIMEOUT'
}
```

### Updated GeminiService with Retry

```typescript
// packages/api/src/services/GeminiService.ts
import { Effect, Layer, pipe } from 'effect'
import { geminiRetrySchedule } from '../lib/retry'
import { GeminiError, isRetryableGeminiError } from '../lib/errors'

export const GeminiServiceLive = Layer.succeed(
  GeminiService,
  {
    generateImage: (imageUrl, prompt) =>
      pipe(
        // Core API call
        callGeminiWithEffect(imageUrl, prompt),
        
        // Retry only retryable errors (predicate lives in schedule)
        Effect.retry(geminiRetrySchedule),
        
        // 60s timeout for entire operation including retries
        Effect.timeout('60 seconds'),
        Effect.mapError((e) => {
          if (e._tag === 'TimeoutException') {
            return new GeminiError({ 
              cause: 'TIMEOUT', 
              message: 'Operation timed out after 60s including retries',
            })
          }
          return e
        })
      )
  }
)
```

### Retry Flow Visualization

```
Attempt 1: Call Gemini API
    │
    ├─ Success → Return result
    │
    └─ Failure (retryable)
         │
         ├─ Log to Sentry (breadcrumb)
         ├─ Track analytics (gemini_retry)
         └─ Wait 1s (with jitter)
              │
Attempt 2: Call Gemini API
    │
    ├─ Success → Return result
    │
    └─ Failure (retryable)
         │
         └─ Wait 2s (with jitter)
              │
Attempt 3: Call Gemini API
    │
    ├─ Success → Return result
    │
    └─ Failure (retryable)
         │
         └─ Wait 4s (with jitter)
              │
Attempt 4 (final): Call Gemini API
    │
    ├─ Success → Return result
    │
    └─ Failure → Return error with all context
```

### Non-Retryable Error Fast Fail

```typescript
// Example: INVALID_IMAGE fails immediately
// Attempt 1: Gemini returns "invalid image format"
//     → Maps to GeminiError { cause: 'INVALID_IMAGE', retryable: false }
//     → Effect.retry `while` predicate returns false
//     → Error returned immediately to caller
//     → No further attempts

// Example: CONTENT_POLICY fails immediately  
// Attempt 1: Gemini safety filter blocks output
//     → Maps to GeminiError { cause: 'CONTENT_POLICY' }
//     → Error returned immediately
//     → User sees "We couldn't process this image" message
```

### Sentry Logging Pattern

```typescript
// packages/api/src/services/GeminiService.ts
import * as Sentry from '@sentry/node'

// On each retry attempt
Sentry.addBreadcrumb({
  category: 'gemini',
  message: `Gemini API retry attempt`,
  level: 'warning',
  data: {
    attempt: attemptNumber,
    error_type: error.cause,
    error_message: error.message,
    time_since_start_ms: Date.now() - startTime
  }
})

// On final failure (all retries exhausted)
Sentry.captureException(finalError, {
  tags: {
    service: 'gemini',
    error_type: finalError.cause,
  },
  extra: {
    upload_id: uploadId,
    total_attempts: 4,
    total_duration_ms: Date.now() - startTime,
  }
})
```

### Analytics Events

```typescript
// Track each retry
yield* PostHogService.capture('gemini_retry', uploadId, {
  upload_id: uploadId,
  attempt: attemptNumber,  // 2, 3, or 4
  error_type: error.cause,
  delay_before_retry_ms: delayMs,
})

// Track exhausted retries
yield* PostHogService.capture('gemini_exhausted', uploadId, {
  upload_id: uploadId,
  total_attempts: 4,
  final_error_type: finalError.cause,
  total_duration_ms: totalDuration,
})
```

### File Structure

```
packages/api/src/
├── lib/
│   ├── retry.ts             <- NEW: Reusable retry schedules
│   └── errors.ts            <- UPDATE: Add retryable property to GeminiError
├── services/
│   └── GeminiService.ts     <- UPDATE: Add retry logic
```

### Testing Retry Logic

```typescript
// packages/api/src/services/GeminiService.test.ts
import { Effect, TestClock, Fiber } from 'effect'

describe('GeminiService retry', () => {
  it('retries on RATE_LIMITED error', async () => {
    let attempts = 0
    const mockService = {
      generateImage: () => {
        attempts++
        if (attempts < 3) {
          return Effect.fail(new GeminiError({ 
            cause: 'RATE_LIMITED', 
            message: 'Too many requests',
            retryable: true 
          }))
        }
        return Effect.succeed(Buffer.from('image'))
      }
    }
    
    const result = await Effect.runPromise(
      mockService.generateImage().pipe(
        Effect.retry(geminiRetrySchedule)
      )
    )
    
    expect(attempts).toBe(3)
    expect(result).toBeDefined()
  })
  
  it('fails immediately on INVALID_IMAGE', async () => {
    let attempts = 0
    const mockService = {
      generateImage: () => {
        attempts++
        return Effect.fail(new GeminiError({ 
          cause: 'INVALID_IMAGE', 
          message: 'Bad image',
          retryable: false 
        }))
      }
    }
    
    await expect(
      Effect.runPromise(
        mockService.generateImage().pipe(
          Effect.retry({
            schedule: geminiRetrySchedule,
            while: isRetryableGeminiError
          })
        )
      )
    ).rejects.toThrow()
    
    expect(attempts).toBe(1) // No retries
  })
})
```

### Dependencies

- **Story 4.2 (Gemini Integration):** ✅ GeminiService must exist
- **Effect Schedule:** Built into Effect library
- **Sentry:** Already configured (Story 1.6)
- **PostHog:** Already configured (Story 1.5)

### What This Enables

- More reliable AI processing (handles transient failures)
- Better user experience (fewer random failures)
- Analytics insight into failure patterns

### References

- [Source: _bmad-output/epics.md#Story 4.3] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Effect Service Pattern] - Retry with Schedule
- [Source: _bmad-output/prd.md#FR-2.4] - Retry on transient failures (3x)
- [Source: _bmad-output/epics.md#Risk Register] - Gemini API quality/stability risk

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
