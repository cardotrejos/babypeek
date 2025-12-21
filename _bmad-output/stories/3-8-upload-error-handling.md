# Story 3.8: Upload Error Handling

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **clear feedback if my upload fails**,
so that **I can try again without frustration**.

## Acceptance Criteria

1. **AC-1:** Network failures show warm error message ("Oops! Let's try that again")
2. **AC-2:** A retry button is displayed when upload fails
3. **AC-3:** Errors are logged to Sentry without PII (email, IP, etc.)
4. **AC-4:** Partial uploads are cleaned up from R2 on failure
5. **AC-5:** Specific error types have contextual messages (network, timeout, server, rate limit)

## Current State Analysis

**Already Implemented (Story 3.5):**
- ✅ Basic error handling in `useUpload` hook
- ✅ `getErrorMessage()` function with warm copy
- ✅ Sentry error reporting (no PII)
- ✅ Toast notifications for errors
- ✅ `upload_failed` analytics event
- ✅ Error state in hook allows retry via `reset()`

**Gaps to Address:**
- ❌ R2 partial upload cleanup
- ❌ Explicit retry button UI component
- ❌ Rate limit specific error handling (429 status)
- ❌ More granular error categorization
- ❌ Offline detection and handling
- ❌ Server-side cleanup endpoint

## Tasks / Subtasks

- [ ] **Task 1: Create R2 cleanup endpoint** (AC: 4)
  - [ ] Create `DELETE /api/upload/:uploadId` endpoint
  - [ ] Verify sessionToken before allowing deletion
  - [ ] Call R2Service to delete `uploads/{uploadId}/` prefix
  - [ ] Handle "not found" gracefully (already deleted)
  - [ ] Log cleanup to Sentry for debugging

- [ ] **Task 2: Enhance useUpload with cleanup** (AC: 4)
  - [ ] Add `cleanupUpload(uploadId: string)` method
  - [ ] Call cleanup on upload failure (after R2 PUT fails)
  - [ ] Don't block on cleanup - fire and forget
  - [ ] Track `upload_cleanup_triggered` event

- [ ] **Task 3: Add retry button to error UI** (AC: 2)
  - [ ] Create `UploadError` component in `apps/web/src/components/upload/`
  - [ ] Display error message prominently
  - [ ] Show "Try Again" button that calls `reset()`
  - [ ] Maintain file selection on retry (optional)
  - [ ] Style with warm/encouraging design

- [ ] **Task 4: Enhance error categorization** (AC: 1, 5)
  - [ ] Add error type enum: NETWORK, TIMEOUT, SERVER, RATE_LIMIT, VALIDATION, UNKNOWN
  - [ ] Parse response codes to categorize errors
  - [ ] Update `getErrorMessage()` with more specific copy
  - [ ] Handle 429 rate limit with retry-after countdown

- [ ] **Task 5: Add offline detection** (AC: 1)
  - [ ] Check `navigator.onLine` before upload
  - [ ] Show "You appear to be offline" message
  - [ ] Add event listener for online/offline events
  - [ ] Auto-retry when back online (optional)

- [ ] **Task 6: Improve Sentry context** (AC: 3)
  - [ ] Add error category tag
  - [ ] Add upload phase (requesting, uploading)
  - [ ] Add retry count context
  - [ ] Verify no PII in breadcrumbs
  - [ ] Add user fingerprint without email

- [ ] **Task 7: Create error recovery flow** (AC: 2)
  - [ ] Track retry attempts (max 3 auto-retries for transient errors)
  - [ ] Show progress of retries ("Retry 2 of 3...")
  - [ ] Give up gracefully after max retries
  - [ ] Allow manual retry indefinitely

- [ ] **Task 8: Write comprehensive tests**
  - [ ] Unit test: Error categorization maps correctly
  - [ ] Unit test: Cleanup called on upload failure
  - [ ] Unit test: Retry resets state properly
  - [ ] Unit test: Offline detection works
  - [ ] Integration test: Full error → cleanup → retry flow
  - [ ] Mock R2 cleanup endpoint

## Dev Notes

### Architecture Compliance

- **Framework:** TanStack Start + React
- **Backend:** Hono + Effect services
- **Storage:** Cloudflare R2
- **Error Tracking:** Sentry
- **Analytics:** PostHog

### Current Error Handling (from use-upload.ts)

```typescript
// Existing error message helper
function getErrorMessage(errorType: string): string {
  if (errorType.includes("Network")) {
    return "We couldn't upload your image. Please check your connection and try again!"
  }
  if (errorType.includes("timeout") || errorType.includes("timed out")) {
    return "The upload took too long. Please check your connection and try again."
  }
  if (errorType.includes("Server") || errorType.includes("500")) {
    return "Something went wrong on our end. Let's give it another try!"
  }
  return "We had trouble uploading your image. Let's try again!"
}
```

### Enhanced Error Type System

```typescript
// apps/web/src/lib/upload-errors.ts
export type UploadErrorType = 
  | "NETWORK"      // Network failure, offline
  | "TIMEOUT"      // Request timed out
  | "SERVER"       // 5xx errors
  | "RATE_LIMIT"   // 429 - too many requests
  | "VALIDATION"   // 400 - invalid request
  | "UNAUTHORIZED" // 401/403 - auth issues
  | "NOT_FOUND"    // 404 - resource missing
  | "CANCELLED"    // User cancelled
  | "UNKNOWN"      // Fallback

export interface UploadError {
  type: UploadErrorType
  message: string
  userMessage: string
  retryable: boolean
  retryAfter?: number // seconds (for rate limit)
}

export function categorizeError(error: Error | Response): UploadError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'NETWORK',
      message: error.message,
      userMessage: "Oops! Looks like you're offline. Check your connection and try again!",
      retryable: true,
    }
  }
  
  // Response errors
  if (error instanceof Response) {
    switch (error.status) {
      case 429:
        return {
          type: 'RATE_LIMIT',
          message: 'Rate limit exceeded',
          userMessage: "You've reached the upload limit. Please try again later.",
          retryable: true,
          retryAfter: parseInt(error.headers.get('Retry-After') || '3600'),
        }
      case 500:
      case 502:
      case 503:
        return {
          type: 'SERVER',
          message: `Server error: ${error.status}`,
          userMessage: "Something went wrong on our end. Let's give it another try!",
          retryable: true,
        }
      // ... more cases
    }
  }
  
  return {
    type: 'UNKNOWN',
    message: String(error),
    userMessage: "We had trouble uploading your image. Let's try again!",
    retryable: true,
  }
}
```

### R2 Cleanup Endpoint

```typescript
// packages/api/src/routes/upload.ts - Add cleanup endpoint
app.delete("/:uploadId", async (c) => {
  const uploadId = c.req.param("uploadId")
  
  // Optional: Verify sessionToken
  const sessionToken = c.req.header("X-Session-Token")
  
  const program = Effect.gen(function* () {
    const r2 = yield* R2Service
    // Delete all objects with prefix uploads/{uploadId}/
    yield* r2.deletePrefix(`uploads/${uploadId}/`)
    return { success: true }
  }).pipe(
    Effect.provide(R2ServiceLive),
    Effect.catchAll(() => Effect.succeed({ success: true })) // Don't fail if not found
  )
  
  const result = await Effect.runPromise(program)
  return c.json(result)
})
```

### R2Service Enhancement

```typescript
// packages/api/src/services/R2Service.ts - Add deletePrefix method
interface R2ServiceInterface {
  // ... existing methods
  deletePrefix: (prefix: string) => Effect.Effect<void, R2Error>
  deleteObject: (key: string) => Effect.Effect<void, R2Error>
}

// Implementation
deletePrefix: (prefix) =>
  Effect.gen(function* () {
    // List objects with prefix
    const objects = yield* listObjects(prefix)
    // Delete each (or use batch delete if available)
    for (const obj of objects) {
      yield* deleteObject(obj.key)
    }
  })
```

### UploadError Component

```tsx
// apps/web/src/components/upload/upload-error.tsx
interface UploadErrorProps {
  error: UploadError
  onRetry: () => void
  retrying?: boolean
}

export function UploadError({ error, onRetry, retrying }: UploadErrorProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center">
      {/* Error icon */}
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      
      {/* Error message */}
      <p className="text-lg font-medium text-foreground">
        {error.userMessage}
      </p>
      
      {/* Rate limit countdown */}
      {error.type === 'RATE_LIMIT' && error.retryAfter && (
        <p className="text-sm text-muted-foreground">
          Try again in {formatTime(error.retryAfter)}
        </p>
      )}
      
      {/* Retry button */}
      {error.retryable && (
        <Button 
          onClick={onRetry} 
          disabled={retrying}
          className="min-w-[140px]"
        >
          {retrying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            'Try Again'
          )}
        </Button>
      )}
    </div>
  )
}
```

### Offline Detection

```typescript
// apps/web/src/hooks/use-online-status.ts
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// Usage in upload flow
const isOnline = useOnlineStatus()

if (!isOnline) {
  return {
    type: 'NETWORK',
    userMessage: "You're offline. Please check your internet connection.",
    retryable: true,
  }
}
```

### Enhanced Sentry Context

```typescript
// In useUpload error handler
Sentry.captureException(error, {
  tags: {
    component: 'use-upload',
    action: 'upload',
    errorType: categorizedError.type,
    phase: state.status, // 'requesting' | 'uploading'
    retryCount: retryCountRef.current,
  },
  extra: {
    fileSize: file.size,
    fileType: file.type,
    progress: progressRef.current,
    // NO email, NO IP, NO identifiable info
  },
  fingerprint: ['upload-error', categorizedError.type],
})
```

### Error Copy Table (Warm Tone)

| Error Type | User Message |
|------------|--------------|
| NETWORK | "Oops! Looks like you're offline. Check your connection and try again!" |
| TIMEOUT | "The upload took a bit too long. Let's give it another shot!" |
| SERVER | "Something went wrong on our end. Let's give it another try!" |
| RATE_LIMIT | "You've reached the upload limit. Please try again in X minutes." |
| VALIDATION | "We couldn't process that file. Try a different image?" |
| CANCELLED | (No message - user initiated) |
| UNKNOWN | "We had trouble uploading your image. Let's try again!" |

### File Structure

```
apps/web/src/
├── lib/
│   └── upload-errors.ts           <- NEW
├── hooks/
│   ├── use-upload.ts              <- UPDATE
│   ├── use-online-status.ts       <- NEW
│   └── use-upload.test.ts         <- UPDATE
├── components/upload/
│   ├── upload-error.tsx           <- NEW
│   ├── upload-error.test.tsx      <- NEW
│   └── upload-form.tsx            <- UPDATE

packages/api/src/
├── routes/
│   └── upload.ts                  <- UPDATE (add DELETE endpoint)
├── services/
│   └── R2Service.ts               <- UPDATE (add deletePrefix)
```

### Dependencies

- Story 3.5 (Presigned URL) - Base upload implementation ✅
- Story 3.7 (Rate Limiting) - 429 handling dependency

### What This Enables

- Better user experience during upload failures
- Cost savings by cleaning up partial uploads
- Better debugging with categorized Sentry errors
- Foundation for retry logic in AI processing (Epic 4)

### References

- [Source: _bmad-output/epics.md#Story 3.8] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Error Handling] - Error patterns
- [Source: apps/web/src/hooks/use-upload.ts] - Current implementation
- [Source: _bmad-output/prd.md#FR-1.7] - Handle upload interruption

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
