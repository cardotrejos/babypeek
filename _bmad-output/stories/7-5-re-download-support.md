# Story 7.5: Re-Download Support

Status: done

## Story

As a **user**,
I want **to re-download my image within 30 days**,
so that **I can recover it if I lose the file**.

## Acceptance Criteria

1. **AC-1:** Given I purchased within the last 30 days (FR-5.6), when I return to my result page with my session token, then I can generate a new download link
2. **AC-2:** The download button is available on the result page after purchase
3. **AC-3:** After 30 days, the option shows "Download expired"
4. **AC-4:** Each re-download generates a fresh 7-day signed URL
5. **AC-5:** Re-downloads are tracked for analytics

## Tasks / Subtasks

- [x] **Task 1: Create download page route** (AC: 1, 2, 3)
  - [x] Create `apps/web/src/routes/download.$uploadId.tsx`
  - [x] Validate session token on page load
  - [x] Check purchase exists and is < 30 days old
  - [x] Show download button or expiry message

- [x] **Task 2: Add 30-day check to download API** (AC: 1, 3)
  - [x] Update `packages/api/src/routes/download.ts`
  - [x] Add check: `purchase.createdAt` + 30 days > now
  - [x] Return specific error code for expired downloads
  - [x] Include expiry date in error message

- [x] **Task 3: Update RevealUI for purchased state** (AC: 2)
  - [x] Detect if purchase exists for current upload
  - [x] Show "Download HD" button instead of "Get HD Version"
  - [x] Use same DownloadButton component from Story 7.3

- [x] **Task 4: Create expiry UI component** (AC: 3)
  - [x] Create `apps/web/src/components/download/DownloadExpired.tsx`
  - [x] Show warm message about expiry
  - [x] Offer "Create New Portrait" CTA
  - [x] Link to support for special cases

- [x] **Task 5: Add re-download tracking** (AC: 5)
  - [x] Track `redownload_clicked` event with is_redownload flag
  - [x] Include days_since_purchase in event
  - [x] Track `download_expired_viewed` when showing expiry

- [x] **Task 6: Write tests**
  - [x] Unit test: Download allowed within 30 days
  - [x] Unit test: Download blocked after 30 days
  - [x] Unit test: Correct error message for expired
  - [x] Unit test: Fresh URL generated each time

## Dev Notes

### Architecture Compliance

- **Route Pattern:** TanStack Start file-based routing
- **Auth:** Session token from localStorage
- **API:** Same download endpoint with 30-day validation

### Existing Code to Leverage

**Purchase schema has createdAt** (packages/db/src/schema/index.ts):
```typescript
export const purchases = pgTable("purchases", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  uploadId: text("upload_id").notNull().references(() => uploads.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // ...
})
```

**PurchaseService.getByUploadId** (packages/api/src/services/PurchaseService.ts):
```typescript
getByUploadId: (uploadId: string) => Effect.Effect<Purchase | null, never>
```

### Download Page Implementation

```typescript
// apps/web/src/routes/download.$uploadId.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { getSession } from "@/lib/session"
import { DownloadButton } from "@/components/download"
import { DownloadExpired } from "@/components/download/DownloadExpired"
import { API_BASE_URL } from "@/lib/api-config"
import { posthog, isPostHogConfigured } from "@/lib/posthog"

export const Route = createFileRoute("/download/$uploadId")({
  component: DownloadPage,
})

interface DownloadStatus {
  canDownload: boolean
  isExpired: boolean
  expiresAt: string | null
  daysRemaining: number | null
  error?: string
}

function DownloadPage() {
  const { uploadId } = Route.useParams()
  const navigate = useNavigate()
  const sessionToken = getSession(uploadId)

  // Check download eligibility
  const { data, isLoading, error } = useQuery<DownloadStatus>({
    queryKey: ["download-status", uploadId],
    queryFn: async () => {
      if (!sessionToken) {
        return { canDownload: false, isExpired: false, expiresAt: null, daysRemaining: null, error: "Session not found" }
      }

      const response = await fetch(`${API_BASE_URL}/api/download/${uploadId}/status`, {
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        
        // Check if expired
        if (data.error?.code === "DOWNLOAD_EXPIRED") {
          // AC-5: Track expiry view
          if (isPostHogConfigured()) {
            posthog.capture("download_expired_viewed", { upload_id: uploadId })
          }
          return { canDownload: false, isExpired: true, expiresAt: data.error.expiresAt, daysRemaining: null }
        }
        
        throw new Error(data.error?.message || "Failed to check download status")
      }

      return response.json()
    },
    enabled: !!sessionToken,
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="size-12 animate-spin rounded-full border-4 border-coral border-t-transparent" />
      </div>
    )
  }

  // No session
  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-2xl text-charcoal">Session Not Found</h1>
          <p className="text-warm-gray">
            We couldn't find your download session. Try accessing the link from your email.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="px-6 py-3 bg-coral text-white rounded-lg"
          >
            Create New Portrait
          </button>
        </div>
      </div>
    )
  }

  // AC-3: Expired state
  if (data?.isExpired) {
    return <DownloadExpired uploadId={uploadId} expiresAt={data.expiresAt} />
  }

  // Error state
  if (error || !data?.canDownload) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-display text-2xl text-charcoal">Download Unavailable</h1>
          <p className="text-warm-gray">
            {error instanceof Error ? error.message : "Unable to access download. Please check your purchase."}
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="px-6 py-3 bg-coral text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  // AC-1, AC-2: Download available
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <span className="text-5xl">👶</span>
          <h1 className="font-display text-3xl text-charcoal">Your HD Photo</h1>
          <p className="text-warm-gray">
            {data.daysRemaining && data.daysRemaining > 0
              ? `Download available for ${data.daysRemaining} more days`
              : "Your download is ready"
            }
          </p>
        </div>

        {/* Download button */}
        <DownloadButton
          uploadId={uploadId}
          sessionToken={sessionToken}
          onSuccess={() => {
            // AC-5: Track re-download
            if (isPostHogConfigured()) {
              posthog.capture("redownload_completed", {
                upload_id: uploadId,
                is_redownload: true,
                days_remaining: data.daysRemaining,
              })
            }
          }}
        />

        {/* Expiry notice */}
        {data.daysRemaining && data.daysRemaining < 7 && (
          <p className="text-sm text-amber-600">
            ⏰ Only {data.daysRemaining} days left to download
          </p>
        )}
      </div>
    </div>
  )
}
```

### Download Status Endpoint

```typescript
// Add to packages/api/src/routes/download.ts

/**
 * GET /api/download/:uploadId/status
 * Check if download is available (for re-download page)
 */
app.get("/:uploadId/status", async (c) => {
  const uploadId = c.req.param("uploadId")
  const token = c.req.header("X-Session-Token")

  if (!token) {
    return c.json({ canDownload: false, error: { code: "UNAUTHORIZED" } }, 401)
  }

  const program = Effect.gen(function* () {
    // Validate session and upload...
    
    // Get purchase
    const purchaseService = yield* PurchaseService
    const purchase = yield* purchaseService.getByUploadId(uploadId)
    
    if (!purchase || purchase.status !== "completed") {
      return { canDownload: false, isExpired: false, error: "No purchase found" }
    }

    // AC-1, AC-3: Check 30-day window
    const purchaseDate = new Date(purchase.createdAt)
    const expiryDate = new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    const now = new Date()

    if (now > expiryDate) {
      return {
        canDownload: false,
        isExpired: true,
        expiresAt: expiryDate.toISOString(),
        daysRemaining: null,
        error: { code: "DOWNLOAD_EXPIRED", expiresAt: expiryDate.toISOString() }
      }
    }

    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      canDownload: true,
      isExpired: false,
      expiresAt: expiryDate.toISOString(),
      daysRemaining,
    }
  })

  // ... run program
})
```

### DownloadExpired Component

```typescript
// apps/web/src/components/download/DownloadExpired.tsx
import { useNavigate } from "@tanstack/react-router"

interface DownloadExpiredProps {
  uploadId: string
  expiresAt: string | null
}

export function DownloadExpired({ uploadId, expiresAt }: DownloadExpiredProps) {
  const navigate = useNavigate()
  
  const expiredDate = expiresAt 
    ? new Date(expiresAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : null

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="size-20 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-4xl">⏰</span>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="font-display text-2xl text-charcoal">
            Download Expired
          </h1>
          <p className="text-warm-gray">
            {expiredDate
              ? `Your download access expired on ${expiredDate}. Downloads are available for 30 days after purchase.`
              : "Your download access has expired. Downloads are available for 30 days after purchase."
            }
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="w-full px-6 py-3 bg-coral text-white font-body rounded-lg hover:bg-coral/90"
          >
            Create New Portrait
          </button>
          
          <p className="text-sm text-warm-gray">
            Need help? <a href="mailto:support@babypeek.com" className="text-coral underline">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  )
}
```

### 30-Day Check in Download API

```typescript
// Update packages/api/src/routes/download.ts

// After verifying purchase exists:
const purchaseDate = new Date(purchase.createdAt)
const thirtyDaysLater = new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

if (new Date() > thirtyDaysLater) {
  return yield* Effect.fail(new DownloadExpiredError({
    uploadId,
    expiredAt: thirtyDaysLater.toISOString(),
  }))
}
```

### File Structure

```
apps/web/src/routes/
├── download.$uploadId.tsx     <- NEW: Re-download page

apps/web/src/components/download/
├── DownloadButton.tsx         <- Existing (Story 7.3)
├── DownloadExpired.tsx        <- NEW: Expiry UI
├── index.ts                   <- UPDATE: Export DownloadExpired

packages/api/src/routes/
├── download.ts                <- UPDATE: Add 30-day check + status endpoint

packages/api/src/lib/
├── errors.ts                  <- UPDATE: Add DownloadExpiredError
```

### Dependencies

- **Story 7.1 (HD Retrieval):** Base download endpoint
- **Story 7.3 (Download Button):** DownloadButton component
- **PurchaseService:** getByUploadId for date check

### What This Enables

- Users can re-download any time within 30 days
- Clear expiry messaging prevents confusion
- Analytics track re-download patterns

### References

- [Source: _bmad-output/epics.md#Story 7.5] - Re-Download Support requirements
- [Source: _bmad-output/prd.md#FR-5.6] - Support re-download within 30 days
- [Source: packages/db/src/schema/index.ts] - Purchase createdAt field
- [Source: apps/web/src/routes/result.$resultId.tsx] - Similar page pattern

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (2025-12-21)

### Debug Log References

- All 30 download tests pass including 8 new Story 7.5 tests
- No TypeScript errors in modified files
- Pre-existing TypeScript errors in other files unrelated to this story

### Completion Notes List

- **Task 1:** Created download page route with session validation, purchase check, and expiry handling
- **Task 2:** Added 30-day window check using purchase.createdAt, returns 410 DOWNLOAD_EXPIRED with expiredAt
- **Task 3:** RevealUI now queries download status and shows DownloadButton if user has purchased
- **Task 4:** Created DownloadExpired component with warm expiry message, "Create New Portrait" CTA, support link
- **Task 5:** Added PostHog tracking: `redownload_completed` (with is_redownload, days_since_purchase), `download_expired_viewed`
- **Task 6:** Added 8 new tests covering 30-day window, expiry response, error messages

### File List

**New Files:**
- apps/web/src/routes/download.$uploadId.tsx
- apps/web/src/components/download/DownloadExpired.tsx

**Modified Files:**
- packages/api/src/lib/errors.ts (added DownloadExpiredError)
- packages/api/src/routes/download.ts (added 30-day check, status endpoint)
- packages/api/src/routes/download.test.ts (added Story 7.5 tests + status endpoint tests)
- apps/web/src/components/download/index.ts (export DownloadExpired)
- apps/web/src/components/reveal/RevealUI.tsx (show DownloadButton if purchased)

## Senior Developer Review (AI)

**Review Date:** 2025-12-21
**Reviewer:** Claude Opus 4.5 (Code Review Agent)
**Review Outcome:** ✅ Approved (after fixes)

### Issues Found and Resolved

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| 1 | HIGH | New files not staged in git | ✅ Fixed - `git add` executed |
| 2 | HIGH | Story 7.6 imports on untracked files | ✅ Fixed - Files staged |
| 3 | MEDIUM | Unused `uploadId` prop in DownloadExpired | ✅ Fixed - Prop removed |
| 4 | MEDIUM | Event fires on success, named "clicked" | ✅ Fixed - Renamed to `redownload_completed` |
| 5 | MEDIUM | Missing tests for /status endpoint | ✅ Fixed - 7 tests added |
| 6 | LOW | No frontend tests for DownloadExpired | Deferred (low priority) |
| 7 | LOW | File List missing routeTree.gen.ts | Noted (auto-generated file) |

### Test Results After Fixes

- **37 tests pass** (30 original + 7 new status endpoint tests)
- All ACs implemented and verified
- No regressions introduced
