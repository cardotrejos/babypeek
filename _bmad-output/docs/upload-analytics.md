# Upload Analytics Events Documentation

> This document defines all analytics events related to the upload funnel in BabyPeek.
> Events are sent to PostHog via the `useAnalytics` hook.

## Event Naming Conventions

- **Prefix:** Events are prefixed by feature area (`upload_`, `heic_`, `compression_`, etc.)
- **Format:** `{feature}_{action}` using snake_case
- **Actions:** `started`, `completed`, `failed`, `cancelled`, `skipped`

## Upload Funnel Stages

```
[Page Load]
    |
    v
upload_file_selected -----> upload_validation_error (if invalid)
    |
    v
[HEIC?] --> heic_conversion_started --> heic_conversion_completed/error
    |
    v
[Large?] --> compression_started --> compression_completed/skipped/failed
    |
    v
email_entered --> email_validation_error (if invalid)
    |
    v
upload_form_completed
    |
    v
presigned_url_requested --> upload_started
    |
    v
upload_progress (25%, 50%, 75%)
    |
    v
upload_completed  OR  upload_failed  OR  upload_cancelled
    |
    v
session_created --> upload_confirmed
```

## Events Reference

### Image Selection (Story 3.1)

| Event | Properties | Description |
|-------|------------|-------------|
| `upload_file_selected` | `file_type`, `file_size` | User selected a file for upload |
| `upload_validation_error` | `type: 'file_type' \| 'file_size'`, `file_type?`, `file_size?` | File rejected due to validation |

### HEIC Conversion (Story 3.2)

| Event | Properties | Description |
|-------|------------|-------------|
| `heic_conversion_started` | `fileSize`, `fileSizeMB` | HEIC to JPEG conversion began |
| `heic_conversion_completed` | `durationMs`, `inputSize`, `outputSize` | Conversion succeeded |
| `heic_conversion_error` | `errorType`, `fileSize` | Conversion failed |
| `heic_large_file_warning` | `fileSizeMB` | User warned about large HEIC file |

### Compression (Story 3.3)

| Event | Properties | Description |
|-------|------------|-------------|
| `compression_started` | `fileSize`, `fileSizeMB`, `fileType` | Image compression began |
| `compression_completed` | `durationMs`, `originalSize`, `compressedSize`, `compressionRatio` | Compression succeeded |
| `compression_skipped` | `reason: 'under_threshold' \| 'gif_file' \| 'already_optimized'`, `fileSize` | Compression not needed |
| `compression_failed` | `errorType`, `fileSize` | Compression failed |

### Email Capture (Story 3.4)

| Event | Properties | Description |
|-------|------------|-------------|
| `email_entered` | (none - no PII) | User entered email |
| `email_validation_error` | `errorType` | Email validation failed |
| `upload_form_completed` | (none) | Form ready for submission |

### Upload Flow (Story 3.5)

| Event | Properties | Description |
|-------|------------|-------------|
| `presigned_url_requested` | `latencyMs` | Presigned URL API call completed |
| `upload_started` | `file_type`, `file_size` | Upload to R2 began |
| `upload_progress` | `percent`, `milestone` | Progress milestone reached (25%, 50%, 75%) |
| `upload_completed` | `upload_id`, `file_size`, `file_type`, `duration_ms` | Upload succeeded |
| `upload_failed` | `errorType`, `file_size` | Upload failed |
| `upload_cancelled` | `progressPercent` | User cancelled upload |

### Session & Confirmation (Story 3.6)

| Event | Properties | Description |
|-------|------------|-------------|
| `session_created` | `upload_id` | Session token stored |
| `upload_confirmed` | `upload_id` | Server confirmed upload |

### Rate Limiting (Story 3.7)

| Event | Properties | Description |
|-------|------------|-------------|
| `rate_limit_exceeded` | `retryAfter`, `file_type`, `file_size` | User hit rate limit (429) |

### Error Handling (Story 3.8)

| Event | Properties | Description |
|-------|------------|-------------|
| `upload_cleanup_triggered` | `upload_id` | Partial upload cleanup initiated |

## Key Metrics

### Primary KPIs

| Metric | Formula | Description |
|--------|---------|-------------|
| **Upload Success Rate** | `upload_completed / upload_started * 100` | Percentage of uploads that succeed |
| **Funnel Conversion** | `upload_completed / upload_file_selected * 100` | Full funnel conversion |
| **Average Duration** | `avg(duration_ms)` from `upload_completed` | Average upload time |
| **Abandon Rate** | `(upload_started - upload_completed - upload_cancelled) / upload_started * 100` | Uploads that fail |

### Secondary Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| **HEIC Conversion Rate** | `heic_conversion_started / upload_started` | % of uploads requiring HEIC conversion |
| **Compression Rate** | `compression_started / upload_started` | % of uploads requiring compression |
| **Average Compression Ratio** | `avg(compressionRatio)` from `compression_completed` | How much files are compressed |
| **Rate Limit Hit Rate** | `rate_limit_exceeded / upload_started` | % of uploads blocked by rate limit |

## Privacy Considerations

- **No PII:** Email addresses are never included in events
- **IP Anonymization:** PostHog automatically anonymizes IPs
- **File Content:** Never captured or logged
- **Session IDs:** Anonymous UUIDs, not tied to identity

## PostHog Funnel Definitions

### Funnel 1: Upload Completion
```
Step 1: upload_file_selected
Step 2: upload_started
Step 3: upload_completed
```

### Funnel 2: Email to Upload
```
Step 1: email_entered
Step 2: upload_form_completed
Step 3: upload_started
Step 4: upload_completed
```

### Funnel 3: Full Upload Journey
```
Step 1: $pageview (URL contains /upload)
Step 2: upload_file_selected
Step 3: heic_conversion_started (optional)
Step 4: compression_started (optional)
Step 5: email_entered
Step 6: upload_started
Step 7: upload_completed
```

## Implementation Details

All events are fired via the `useAnalytics` hook:

```typescript
import { useAnalytics } from "@/hooks/use-analytics"

const { trackEvent } = useAnalytics()

trackEvent("upload_started", {
  file_type: file.type,
  file_size: file.size,
})
```

## Enhanced Event Properties (Story 3.9)

### Device Context Enrichment

All major events now include device/browser context:

| Property | Type | Description |
|----------|------|-------------|
| `device_type` | `"mobile" \| "tablet" \| "desktop"` | Device category |
| `browser` | `string` | Browser name and version (e.g., "Chrome 120") |
| `os` | `string` | Operating system (e.g., "iOS 17", "macOS") |
| `viewport_width` | `number` | Viewport width in pixels |
| `viewport_height` | `number` | Viewport height in pixels |
| `connection_type` | `string` | Network type: wifi, cellular, ethernet, unknown |
| `effective_type` | `string` | Connection speed: 4g, 3g, 2g, slow-2g |
| `prefers_reduced_motion` | `boolean` | Accessibility preference |
| `is_touch_device` | `boolean` | Touch capability |

### Session Tracking

Upload attempts are correlated within a session:

| Property | Type | Description |
|----------|------|-------------|
| `session_id` | `string` | UUID for the upload session |
| `attempt_number` | `number` | Which attempt this is (1-based) |
| `time_since_session_start` | `number` | Milliseconds since session started |
| `time_since_page_load` | `number` | Milliseconds since page loaded |

### Stage Timing Breakdown

The `upload_completed` and `upload_stage_timing` events include detailed timing:

| Property | Type | Description |
|----------|------|-------------|
| `total_duration` | `number` | Total upload time (ms) |
| `presign_latency` | `number` | Time to get presigned URL (ms) |
| `upload_duration` | `number` | Time to upload to R2 (ms) |

## PostHog Dashboard Queries

### Query 1: Upload Success Rate (Last 7 Days)

```sql
SELECT 
  toDate(timestamp) as date,
  countIf(event = 'upload_started') as started,
  countIf(event = 'upload_completed') as completed,
  countIf(event = 'upload_failed') as failed,
  round(completed / started * 100, 2) as success_rate
FROM events
WHERE timestamp > now() - INTERVAL 7 DAY
  AND event IN ('upload_started', 'upload_completed', 'upload_failed')
GROUP BY date
ORDER BY date
```

### Query 2: Error Type Breakdown

```sql
SELECT 
  JSONExtractString(properties, 'errorType') as error_type,
  count() as count,
  round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
FROM events
WHERE event = 'upload_failed'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY error_type
ORDER BY count DESC
```

### Query 3: Average Upload Duration by Device

```sql
SELECT 
  JSONExtractString(properties, 'device_type') as device,
  round(avg(JSONExtractFloat(properties, 'total_duration')) / 1000, 2) as avg_seconds,
  round(median(JSONExtractFloat(properties, 'total_duration')) / 1000, 2) as median_seconds,
  count() as uploads
FROM events
WHERE event = 'upload_completed'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY device
ORDER BY uploads DESC
```

### Query 4: File Size Distribution

```sql
SELECT 
  CASE 
    WHEN JSONExtractFloat(properties, 'file_size') < 1000000 THEN '< 1MB'
    WHEN JSONExtractFloat(properties, 'file_size') < 5000000 THEN '1-5MB'
    WHEN JSONExtractFloat(properties, 'file_size') < 10000000 THEN '5-10MB'
    ELSE '> 10MB'
  END as size_bucket,
  count() as uploads,
  round(count() * 100.0 / sum(count()) OVER (), 2) as percentage
FROM events
WHERE event = 'upload_completed'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY size_bucket
ORDER BY 
  CASE size_bucket 
    WHEN '< 1MB' THEN 1 
    WHEN '1-5MB' THEN 2 
    WHEN '5-10MB' THEN 3 
    ELSE 4 
  END
```

### Query 5: Stage Timing Breakdown

```sql
SELECT 
  JSONExtractString(properties, 'device_type') as device,
  round(avg(JSONExtractFloat(properties, 'presign_latency')), 0) as avg_presign_ms,
  round(avg(JSONExtractFloat(properties, 'upload_duration')), 0) as avg_upload_ms,
  round(avg(JSONExtractFloat(properties, 'total_duration')), 0) as avg_total_ms
FROM events
WHERE event = 'upload_completed'
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY device
```

### Query 6: Retry Analysis

```sql
-- Analyze success rates by attempt number
-- Uses upload_started events which have attempt_number, joined with outcomes
WITH attempts AS (
  SELECT 
    JSONExtractString(properties, 'session_id') as session_id,
    JSONExtractInt(properties, 'attempt_number') as attempt_number,
    timestamp
  FROM events
  WHERE event = 'upload_started'
    AND timestamp > now() - INTERVAL 7 DAY
),
outcomes AS (
  SELECT 
    JSONExtractString(properties, 'session_id') as session_id,
    1 as completed
  FROM events
  WHERE event = 'upload_completed'
    AND timestamp > now() - INTERVAL 7 DAY
)
SELECT 
  a.attempt_number as attempt,
  count() as uploads,
  sum(coalesce(o.completed, 0)) as completed,
  round(sum(coalesce(o.completed, 0)) * 100.0 / count(), 2) as success_rate
FROM attempts a
LEFT JOIN outcomes o ON a.session_id = o.session_id
GROUP BY a.attempt_number
ORDER BY a.attempt_number
```

### Query 7: Hourly Upload Volume

```sql
SELECT 
  toHour(timestamp) as hour,
  count() as uploads,
  countIf(event = 'upload_completed') as completed,
  countIf(event = 'upload_failed') as failed
FROM events
WHERE event IN ('upload_started', 'upload_completed', 'upload_failed')
  AND timestamp > now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour
```

### Query 8: Connection Type Performance

```sql
SELECT 
  JSONExtractString(properties, 'effective_type') as connection,
  count() as uploads,
  round(avg(JSONExtractFloat(properties, 'total_duration')) / 1000, 2) as avg_seconds,
  round(countIf(event = 'upload_completed') * 100.0 / count(), 2) as success_rate
FROM events
WHERE event IN ('upload_started', 'upload_completed')
  AND timestamp > now() - INTERVAL 7 DAY
GROUP BY connection
ORDER BY uploads DESC
```

## Aggregate Metrics (Tracked Automatically)

PostHog automatically aggregates these metrics:

- **Daily/Hourly Upload Counts:** Via event counts by time
- **Success/Failure Ratios:** Via event breakdown
- **Average Upload Duration:** Via property aggregation
- **File Size Distribution:** Via property bucketing

Custom dashboards can be built using the queries above.

## Related Files

- `apps/web/src/hooks/use-analytics.ts` - Analytics hook and event types
- `apps/web/src/hooks/use-upload.ts` - Upload flow events with timing
- `apps/web/src/hooks/use-image-processor.ts` - HEIC/compression events
- `apps/web/src/components/upload/email-input.tsx` - Email events
- `apps/web/src/lib/analytics-context.ts` - Device/browser context enrichment
- `apps/web/src/lib/upload-session.ts` - Session tracking utilities
