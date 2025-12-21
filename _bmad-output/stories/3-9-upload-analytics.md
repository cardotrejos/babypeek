# Story 3.9: Upload Analytics

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **product owner**,
I want **upload funnel metrics tracked**,
so that **I can measure conversion and identify drop-offs**.

## Acceptance Criteria

1. **AC-1:** `upload_started` event fires with file_type, file_size
2. **AC-2:** `upload_completed` event fires with duration
3. **AC-3:** `upload_failed` event fires with error_type
4. **AC-4:** Events are sent to PostHog
5. **AC-5:** Upload funnel can be analyzed: started → completed → conversion rate

## Current State Analysis

**Already Implemented (Stories 3.1-3.5):**
- ✅ `upload_started` with file_type, file_size
- ✅ `upload_completed` with durationMs, file_size, uploadId
- ✅ `upload_failed` with errorType, file_size
- ✅ `upload_cancelled` with progressPercent
- ✅ `upload_progress` at 25%, 50%, 75% milestones
- ✅ `presigned_url_requested` with latencyMs
- ✅ `upload_file_selected` (image picker)
- ✅ `upload_validation_error` (format/size)
- ✅ `email_entered` and `email_validation_error`
- ✅ HEIC conversion events
- ✅ Compression events
- ✅ PostHog integration via `useAnalytics` hook

**Gaps to Address:**
- ❌ Funnel analysis documentation/setup in PostHog
- ❌ Session-level tracking (multiple attempts per session)
- ❌ Device/browser context on events
- ❌ Upload stage timing breakdown
- ❌ Aggregated upload success rate metrics
- ❌ Dashboard or query templates

## Tasks / Subtasks

- [x] **Task 1: Consolidate and document analytics events** (AC: all)
  - [x] Create analytics event documentation file
  - [x] List all upload-related events with properties
  - [x] Define event naming conventions
  - [x] Document funnel stages

- [x] **Task 2: Add device/context enrichment** (AC: 5)
  - [x] Add device type (mobile/desktop/tablet)
  - [x] Add browser name and version
  - [x] Add connection type (wifi/cellular) if available
  - [x] Add viewport size for mobile debugging

- [x] **Task 3: Add session-level tracking** (AC: 5)
  - [x] Generate session ID for upload attempts
  - [x] Track attempt number within session
  - [x] Track time since page load
  - [x] Link events with session ID

- [x] **Task 4: Add stage timing breakdown** (AC: 2)
  - [x] Track `upload_stage_timing` event with:
    - presign_latency
    - upload_duration
    - total_duration
  - [x] Add timing breakdown to `upload_completed`

- [x] **Task 5: Create PostHog funnel configuration** (AC: 5)
  - [x] Document funnel steps in PostHog
  - [x] Create funnel: file_selected → started → completed
  - [x] Create funnel: email_entered → form_completed → upload_started
  - [x] Set up conversion rate insights

- [x] **Task 6: Add aggregate metrics tracking** (AC: 5)
  - [x] Track daily/hourly upload counts
  - [x] Track success/failure ratios
  - [x] Track average upload duration
  - [x] Track file size distribution

- [x] **Task 7: Create analytics dashboard queries** (AC: 5)
  - [x] Document PostHog query for upload funnel
  - [x] Document query for error breakdown
  - [x] Document query for performance metrics
  - [x] Document query for device distribution

- [x] **Task 8: Write comprehensive tests**
  - [x] Unit test: All events fire with correct properties
  - [x] Unit test: Session tracking generates unique IDs
  - [x] Unit test: Timing breakdown is accurate
  - [x] Integration test: Full funnel events in order

## Dev Notes

### Architecture Compliance

- **Analytics:** PostHog via `useAnalytics` hook
- **Pattern:** Event-driven analytics with typed events
- **Privacy:** No PII in events (email hashed if needed)

### Current Analytics Events (Complete List)

```typescript
// From use-analytics.ts
export type AnalyticsEvent =
  // Image Selection (Story 3.1)
  | "upload_file_selected"        // { file_type, file_size }
  | "upload_validation_error"     // { type: 'file_type' | 'file_size', file_type?, file_size? }
  
  // HEIC Conversion (Story 3.2)
  | "heic_conversion_started"     // { fileSize, fileSizeMB }
  | "heic_conversion_completed"   // { durationMs, inputSize, outputSize }
  | "heic_conversion_error"       // { errorType, fileSize }
  | "heic_large_file_warning"     // { fileSizeMB }
  
  // Compression (Story 3.3)
  | "compression_started"         // { fileSize, fileSizeMB, fileType }
  | "compression_completed"       // { durationMs, originalSize, compressedSize, compressionRatio }
  | "compression_skipped"         // { reason, fileSize }
  | "compression_failed"          // { errorType, fileSize }
  
  // Email Capture (Story 3.4)
  | "email_entered"               // {} (no PII)
  | "email_validation_error"      // { errorType }
  | "upload_form_completed"       // {}
  
  // Upload Flow (Story 3.5)
  | "presigned_url_requested"     // { latencyMs }
  | "upload_started"              // { file_type, file_size }
  | "upload_progress"             // { percent, milestone }
  | "upload_completed"            // { durationMs, file_size, uploadId }
  | "upload_failed"               // { errorType, file_size }
  | "upload_cancelled"            // { progressPercent }
```

### Enhanced Event Properties

```typescript
// apps/web/src/lib/analytics-context.ts
export function getAnalyticsContext() {
  return {
    // Device info
    device_type: getDeviceType(),           // 'mobile' | 'tablet' | 'desktop'
    browser: getBrowserInfo(),               // 'Chrome 120' | 'Safari 17'
    os: getOSInfo(),                         // 'iOS 17' | 'Android 14' | 'Windows 11'
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    
    // Connection info (if available)
    connection_type: getConnectionType(),    // 'wifi' | 'cellular' | 'unknown'
    effective_type: getEffectiveType(),      // '4g' | '3g' | 'slow-2g'
    
    // Session info
    session_id: getOrCreateSessionId(),
    time_since_page_load: getTimeSinceLoad(),
  }
}

function getDeviceType(): string {
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

function getConnectionType(): string {
  const connection = (navigator as any).connection
  if (!connection) return 'unknown'
  return connection.type || 'unknown'
}
```

### Session Tracking

```typescript
// apps/web/src/lib/upload-session.ts
const UPLOAD_SESSION_KEY = '3d-ultra-upload-session'

interface UploadSession {
  id: string
  startedAt: number
  attemptCount: number
}

export function getOrCreateUploadSession(): UploadSession {
  const stored = sessionStorage.getItem(UPLOAD_SESSION_KEY)
  
  if (stored) {
    const session = JSON.parse(stored) as UploadSession
    // Expire session after 30 minutes of inactivity
    if (Date.now() - session.startedAt < 30 * 60 * 1000) {
      return session
    }
  }
  
  const newSession: UploadSession = {
    id: crypto.randomUUID(),
    startedAt: Date.now(),
    attemptCount: 0,
  }
  
  sessionStorage.setItem(UPLOAD_SESSION_KEY, JSON.stringify(newSession))
  return newSession
}

export function incrementAttempt(): number {
  const session = getOrCreateUploadSession()
  session.attemptCount++
  sessionStorage.setItem(UPLOAD_SESSION_KEY, JSON.stringify(session))
  return session.attemptCount
}
```

### Stage Timing Breakdown

```typescript
// Enhanced upload_completed event
interface UploadCompletedProperties {
  uploadId: string
  file_size: number
  file_type: string
  
  // Timing breakdown (all in ms)
  total_duration: number
  processing_time: number    // HEIC + compression
  presign_latency: number    // API call
  upload_duration: number    // R2 PUT
  
  // Context
  was_heic_converted: boolean
  was_compressed: boolean
  compression_ratio?: number
  
  // Session
  session_id: string
  attempt_number: number
}

// Usage in useUpload
const timings = {
  processStart: 0,
  processEnd: 0,
  presignStart: 0,
  presignEnd: 0,
  uploadStart: 0,
  uploadEnd: 0,
}

// Track each phase...

trackEvent('upload_completed', {
  uploadId,
  file_size: file.size,
  file_type: file.type,
  
  total_duration: timings.uploadEnd - timings.processStart,
  processing_time: timings.processEnd - timings.processStart,
  presign_latency: timings.presignEnd - timings.presignStart,
  upload_duration: timings.uploadEnd - timings.uploadStart,
  
  was_heic_converted: originalFile.type !== file.type,
  was_compressed: originalSize !== file.size,
  compression_ratio: originalSize / file.size,
  
  session_id: uploadSession.id,
  attempt_number: uploadSession.attemptCount,
  
  ...getAnalyticsContext(), // Device info
})
```

### PostHog Funnel Configuration

```
FUNNEL: Upload Completion
========================
Step 1: upload_file_selected
Step 2: upload_started  
Step 3: upload_completed

Conversion: file_selected → completed
Drop-off analysis: Where users abandon

---

FUNNEL: Email to Upload
=======================
Step 1: email_entered
Step 2: upload_form_completed
Step 3: upload_started
Step 4: upload_completed

---

FUNNEL: Full Upload Journey
===========================
Step 1: Page View (/upload)
Step 2: upload_file_selected
Step 3: heic_conversion_started (optional)
Step 4: compression_started (optional)
Step 5: email_entered
Step 6: upload_started
Step 7: upload_completed
```

### PostHog Queries (Documentation)

```sql
-- Query 1: Upload Success Rate (Last 7 Days)
SELECT 
  toDate(timestamp) as date,
  countIf(event = 'upload_started') as started,
  countIf(event = 'upload_completed') as completed,
  countIf(event = 'upload_failed') as failed,
  completed / started * 100 as success_rate
FROM events
WHERE timestamp > now() - INTERVAL 7 DAY
  AND event IN ('upload_started', 'upload_completed', 'upload_failed')
GROUP BY date
ORDER BY date

-- Query 2: Error Type Breakdown
SELECT 
  JSONExtractString(properties, 'errorType') as error_type,
  count() as count,
  count() / sum(count()) OVER () * 100 as percentage
FROM events
WHERE event = 'upload_failed'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY error_type
ORDER BY count DESC

-- Query 3: Average Upload Duration by Device
SELECT 
  JSONExtractString(properties, 'device_type') as device,
  avg(JSONExtractFloat(properties, 'total_duration')) / 1000 as avg_seconds,
  median(JSONExtractFloat(properties, 'total_duration')) / 1000 as median_seconds
FROM events
WHERE event = 'upload_completed'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY device

-- Query 4: File Size Distribution
SELECT 
  CASE 
    WHEN JSONExtractFloat(properties, 'file_size') < 1000000 THEN '< 1MB'
    WHEN JSONExtractFloat(properties, 'file_size') < 5000000 THEN '1-5MB'
    WHEN JSONExtractFloat(properties, 'file_size') < 10000000 THEN '5-10MB'
    ELSE '> 10MB'
  END as size_bucket,
  count() as uploads
FROM events
WHERE event = 'upload_completed'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY size_bucket
```

### Analytics Event Documentation File

```markdown
# _bmad-output/docs/upload-analytics.md

## Upload Analytics Events

### Event Flow
\`\`\`
[Page Load]
    ↓
upload_file_selected
    ↓
[HEIC?] → heic_conversion_started → heic_conversion_completed
    ↓
[Large?] → compression_started → compression_completed
    ↓
email_entered → upload_form_completed
    ↓
presigned_url_requested → upload_started
    ↓
upload_progress (25%, 50%, 75%)
    ↓
upload_completed OR upload_failed OR upload_cancelled
\`\`\`

### Events Reference

| Event | Properties | Description |
|-------|------------|-------------|
| upload_file_selected | file_type, file_size | User selected a file |
| upload_validation_error | type, file_type?, file_size? | File rejected |
| upload_started | file_type, file_size | Upload began |
| upload_progress | percent, milestone | Progress milestone |
| upload_completed | See detailed props | Upload succeeded |
| upload_failed | errorType, file_size | Upload failed |
| upload_cancelled | progressPercent | User cancelled |

### Key Metrics
- **Upload Success Rate:** completed / started
- **Average Duration:** avg(total_duration)
- **HEIC Conversion Rate:** heic_conversion_started / upload_started
- **Compression Rate:** compression_started / upload_started
\`\`\`
```

### File Structure

```
apps/web/src/
├── lib/
│   ├── analytics-context.ts       <- NEW
│   └── upload-session.ts          <- NEW
├── hooks/
│   ├── use-analytics.ts           <- UPDATE (add context)
│   └── use-upload.ts              <- UPDATE (add timing)

_bmad-output/docs/
└── upload-analytics.md            <- NEW (documentation)
```

### Dependencies

- Story 3.5 (Presigned URL) - Base analytics implementation ✅
- Story 1.5 (PostHog) - PostHog integration ✅

### What This Enables

- Product decisions based on upload funnel data
- Identify drop-off points in user flow
- Monitor upload performance by device/network
- A/B testing upload UX improvements

### Privacy Considerations

- No PII in events (no email, no names)
- IP automatically anonymized by PostHog
- File content never captured
- Session IDs are anonymous

### References

- [Source: _bmad-output/epics.md#Story 3.9] - Acceptance criteria
- [Source: apps/web/src/hooks/use-analytics.ts] - Current implementation
- [Source: apps/web/src/hooks/use-upload.ts] - Current event firing
- [Source: _bmad-output/architecture.md#Analytics] - PostHog patterns

## Dev Agent Record

### Agent Model Used

Claude claude-sonnet-4-20250514

### Debug Log References

- All 345 tests pass (91 API + 254 web)

### Completion Notes List

- Created comprehensive analytics documentation in `_bmad-output/docs/upload-analytics.md`
- Implemented device/browser context enrichment with `getAnalyticsContext()` function
- Added session-level tracking with unique session IDs, attempt counts, and timing
- Enhanced `upload_completed` event with detailed timing breakdown (presign_latency, upload_duration, total_duration)
- Added new `upload_stage_timing` event for detailed funnel analysis
- Documented 8 PostHog queries for dashboard metrics (success rate, error breakdown, duration by device, etc.)
- Added 3 funnel definitions for upload conversion analysis
- Updated `use-analytics.ts` with new event types (`upload_stage_timing`, `upload_cleanup_triggered`, `rate_limit_exceeded`)
- All analytics events now include session and device context automatically

### File List

- _bmad-output/docs/upload-analytics.md (NEW - comprehensive analytics documentation, fixed Query 6)
- apps/web/src/lib/analytics-context.ts (NEW - device/browser context enrichment)
- apps/web/src/lib/analytics-context.test.ts (NEW - 28 unit tests)
- apps/web/src/lib/upload-session.ts (NEW - session tracking utilities)
- apps/web/src/lib/upload-session.test.ts (NEW - 12 unit tests)
- apps/web/src/hooks/use-analytics.ts (MODIFIED - added new event types)
- apps/web/src/hooks/use-upload.ts (MODIFIED - integrated context, session, timing; added session/context to all error paths)
- apps/web/src/hooks/use-upload.test.ts (MODIFIED - added mocks and 4 analytics integration tests)
- apps/web/src/router.tsx (MODIFIED - added initializePageLoadTracking call)

## Change Log

- 2024-12-21: Implemented upload analytics with device context, session tracking, and stage timing
- 2024-12-21: Code review fixes:
  - Added session/context enrichment to upload_failed, rate_limit_exceeded, and offline error events
  - Added initializePageLoadTracking() call in router.tsx for accurate page load timing
  - Fixed PostHog SQL Query 6 (Retry Analysis) to properly join events by session_id
  - Added 4 integration tests for analytics event flow verification
  - All 349 tests pass (258 web + 91 API)
