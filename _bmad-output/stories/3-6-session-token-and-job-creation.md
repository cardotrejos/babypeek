# Story 3.6: Session Token and Job Creation

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user**,
I want **my upload to create a job for processing**,
so that **I can track the progress of my transformation**.

## Acceptance Criteria

1. **AC-1:** A database record is created with status "pending" when upload completes
2. **AC-2:** A jobId (uploadId) is returned to the frontend after upload confirmation
3. **AC-3:** A sessionToken is generated and stored as `3d-ultra-session-{jobId}` in localStorage
4. **AC-4:** User is navigated to the processing screen with the jobId
5. **AC-5:** `upload_completed` event is sent to PostHog with uploadId

## Tasks / Subtasks

- [ ] **Task 1: Extend upload API to create database record** (AC: 1, 2)
  - [ ] Modify `POST /api/upload` to create upload record after presigned URL generation
  - [ ] Generate sessionToken using `crypto.randomUUID()`
  - [ ] Store: email, sessionToken, originalUrl (R2 key), status='pending'
  - [ ] Return jobId (uploadId) and sessionToken in response
  - [ ] Handle duplicate upload attempts gracefully

- [ ] **Task 2: Create upload confirmation endpoint** (AC: 1, 2)
  - [ ] Create `POST /api/upload/:uploadId/confirm` endpoint
  - [ ] Verify upload exists in R2 using HEAD request
  - [ ] Update upload status from 'pending' to 'processing' (or keep pending for workflow)
  - [ ] Return final confirmation with jobId

- [ ] **Task 3: Update useUpload hook for session management** (AC: 3, 4)
  - [ ] Store sessionToken in localStorage as `3d-ultra-session-{jobId}`
  - [ ] Also store `3d-ultra-current-job` for session recovery (Story 5.7 prep)
  - [ ] Return sessionToken from startUpload result
  - [ ] Add navigation callback or return values for routing

- [ ] **Task 4: Integrate with UploadForm submission flow** (AC: 4)
  - [ ] After upload completes, call confirmation endpoint
  - [ ] Store session in localStorage
  - [ ] Navigate to `/processing/{jobId}` route
  - [ ] Handle navigation errors gracefully

- [ ] **Task 5: Add upload_completed analytics** (AC: 5)
  - [ ] Fire `upload_completed` event with: uploadId, fileSize, durationMs, fileType
  - [ ] Track session token generation
  - [ ] Add to use-analytics.ts event types if not present

- [ ] **Task 6: Add session token header helper** (AC: 3)
  - [ ] Create utility function to get session token from localStorage
  - [ ] Create API client wrapper that auto-includes `X-Session-Token` header
  - [ ] Handle missing token scenario

- [ ] **Task 7: Write comprehensive tests**
  - [ ] Unit test: Upload creates database record
  - [ ] Unit test: Session token generation is unique
  - [ ] Unit test: localStorage storage/retrieval
  - [ ] Unit test: Confirmation endpoint validates upload exists
  - [ ] Integration test: Full upload → confirm → navigate flow

## Dev Notes

### Architecture Compliance

- **Framework:** TanStack Start + React (from Better-T-Stack)
- **Backend:** Hono + Effect services
- **Database:** Drizzle ORM + Neon PostgreSQL
- **Session:** Token-based (no auth, per-upload session tokens)
- **Analytics:** PostHog tracking

### Session Token Pattern (from Architecture)

```typescript
// Server: Generate on upload
const sessionToken = crypto.randomUUID()

// Client: Store per job
localStorage.setItem(`3d-ultra-session-${jobId}`, sessionToken)

// Client: Also track current job for recovery
localStorage.setItem('3d-ultra-current-job', jobId)

// Client: Send in header for authenticated requests
headers: { 'X-Session-Token': sessionToken }

// Server: Validate
const upload = await db.query.uploads.findFirst({
  where: eq(uploads.sessionToken, token)
})
if (!upload) throw new UnauthorizedError({ reason: 'INVALID_TOKEN' })
```

### Database Schema (Already Exists)

From `packages/db/src/schema/index.ts`:
```typescript
export const uploads = pgTable("uploads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  email: text("email").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  originalUrl: text("original_url").notNull(),
  resultUrl: text("result_url"),
  previewUrl: text("preview_url"),
  status: text("status", { enum: uploadStatusValues }).default("pending").notNull(),
  workflowRunId: text("workflow_run_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
})
```

### Modified Upload Flow

```
Previous (Story 3.5):
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ POST /api/upload│ → │ Get presigned   │ → │ PUT to R2       │
│ {email, type}   │    │ URL + uploadId  │    │ (with progress) │
└─────────────────┘    └─────────────────┘    └─────────────────┘

New (Story 3.6):
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ POST /api/upload│ → │ Create DB record│ → │ Return uploadId │
│ {email, type}   │    │ + sessionToken  │    │ + sessionToken  │
└─────────────────┘    └─────────────────┘    │ + presignedUrl  │
                                              └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │ PUT to R2       │
                                              │ (with progress) │
                                              └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │ POST /upload/   │
                                              │ {id}/confirm    │
                                              └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │ Store session   │
                                              │ Navigate to     │
                                              │ /processing/{id}│
                                              └─────────────────┘
```

### API Response Updates

```typescript
// POST /api/upload - Updated response
{
  uploadUrl: string,      // Presigned PUT URL (existing)
  uploadId: string,       // cuid2 (existing)
  key: string,            // R2 key (existing)
  expiresAt: string,      // URL expiry (existing)
  sessionToken: string,   // NEW: For authenticated access
}

// POST /api/upload/:id/confirm - New endpoint
// Request: (empty body, uploadId in path)
// Response:
{
  success: true,
  jobId: string,          // Same as uploadId
  status: "pending",      // Ready for processing
}
```

### Session Storage Pattern

```typescript
// apps/web/src/lib/session.ts
export const SESSION_PREFIX = '3d-ultra-session-'
export const CURRENT_JOB_KEY = '3d-ultra-current-job'

export function storeSession(jobId: string, token: string): void {
  localStorage.setItem(`${SESSION_PREFIX}${jobId}`, token)
  localStorage.setItem(CURRENT_JOB_KEY, jobId)
}

export function getSession(jobId: string): string | null {
  return localStorage.getItem(`${SESSION_PREFIX}${jobId}`)
}

export function getCurrentJob(): string | null {
  return localStorage.getItem(CURRENT_JOB_KEY)
}

export function clearSession(jobId: string): void {
  localStorage.removeItem(`${SESSION_PREFIX}${jobId}`)
  const current = getCurrentJob()
  if (current === jobId) {
    localStorage.removeItem(CURRENT_JOB_KEY)
  }
}
```

### useUpload Hook Updates

```typescript
// apps/web/src/hooks/use-upload.ts - Updated interface
interface UploadResult {
  uploadId: string
  sessionToken: string
}

interface UseUploadResult {
  state: UploadState
  startUpload: (file: File, email: string) => Promise<UploadResult | null>
  confirmUpload: (uploadId: string) => Promise<boolean>
  cancelUpload: () => void
  reset: () => void
}

// Inside hook:
const startUpload = async (file: File, email: string) => {
  // ... existing presigned URL + upload logic ...
  
  // After successful upload:
  const confirmed = await confirmUpload(uploadId)
  if (confirmed) {
    // Store session
    storeSession(uploadId, sessionToken)
    
    // Track analytics
    trackEvent({
      name: 'upload_completed',
      properties: {
        uploadId,
        fileSize: file.size,
        fileType: file.type,
        durationMs: Date.now() - startTime
      }
    })
    
    return { uploadId, sessionToken }
  }
  return null
}
```

### Navigation Integration

```typescript
// In UploadForm or parent component
const navigate = useNavigate()

const handleUploadComplete = ({ uploadId, sessionToken }) => {
  // Session already stored by useUpload
  navigate({ to: '/processing/$jobId', params: { jobId: uploadId } })
}

// Usage with UploadForm
<UploadForm
  enableUpload
  onUploadComplete={handleUploadComplete}
/>
```

### Error Handling

| Error | HTTP Status | Message |
|-------|-------------|---------|
| Upload not found | 404 | "Upload not found. Please try again." |
| Upload already confirmed | 409 | "This upload has already been processed." |
| R2 verification failed | 500 | "We couldn't verify your upload. Let's try again!" |
| Session storage failed | N/A | (Silent fail, log to Sentry) |

### UploadService Usage

The `UploadService` already exists with the `create` method:

```typescript
// packages/api/src/services/UploadService.ts
UploadService.create({
  email,
  sessionToken,
  originalUrl: `uploads/${uploadId}/original.${extension}`, // R2 key
})
```

### File Structure

```
apps/web/src/
├── lib/
│   └── session.ts                 <- NEW
├── hooks/
│   ├── use-upload.ts              <- UPDATE
│   └── use-upload.test.ts         <- UPDATE
├── components/upload/
│   └── upload-form.tsx            <- UPDATE (navigation)

packages/api/src/routes/
├── upload.ts                      <- UPDATE (add DB creation + confirm endpoint)
```

### Analytics Events

```typescript
// Add to use-analytics.ts if not present:
| { name: 'upload_completed'; properties: { 
    uploadId: string; 
    fileSize: number; 
    fileType: string; 
    durationMs: number 
  } }
| { name: 'session_created'; properties: { uploadId: string } }
| { name: 'upload_confirmed'; properties: { uploadId: string } }
```

### Dependencies on Previous Stories

- **Story 3.4 (Email Capture):** Provides email input in UploadForm ✅
- **Story 3.5 (Presigned URL):** Provides upload mechanism ✅
- **UploadService:** Already implemented with `create` method ✅
- **Database schema:** Already has uploads table ✅

### What This Enables

- Story 3.7 (Rate Limiting) - rate limit by session/IP
- Story 4.1 (Workflow Job) - can trigger workflow using uploadId
- Story 5.7 (Session Recovery) - `3d-ultra-current-job` storage

### References

- [Source: _bmad-output/epics.md#Story 3.6] - Acceptance criteria
- [Source: _bmad-output/architecture.md#Session Token Pattern] - Token flow
- [Source: _bmad-output/architecture.md#API Design] - Endpoint design
- [Source: packages/db/src/schema/index.ts] - Database schema
- [Source: packages/api/src/services/UploadService.ts] - Existing service

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
