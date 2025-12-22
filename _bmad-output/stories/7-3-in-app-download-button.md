# Story 7.3: In-App Download Button

Status: done

## Story

As a **user**,
I want **to download my HD image directly from the app**,
so that **I can save it to my camera roll immediately**.

## Acceptance Criteria

1. **AC-1:** Given I'm on the download page after purchase (FR-5.5), when I tap "Download HD", then the image downloads to my device
2. **AC-2:** I see download progress if file is large
3. **AC-3:** The filename is "babypeek-baby-{date}.jpg"
4. **AC-4:** Success confirmation is shown after download completes
5. **AC-5:** download_clicked event is sent to PostHog
6. **AC-6:** Button shows loading state while fetching download URL

## Tasks / Subtasks

- [x] **Task 1: Create DownloadButton component** (AC: 1, 2, 3, 6)
  - [x] Create `apps/web/src/components/download/DownloadButton.tsx`
  - [x] Accept props: uploadId, sessionToken, onSuccess, onError
  - [x] Show loading spinner while fetching URL
  - [x] Trigger browser download via anchor with download attribute
  - [x] Handle download progress for large files

- [x] **Task 2: Update checkout-success.tsx** (AC: 1, 4)
  - [x] Replace placeholder button with DownloadButton
  - [x] Pass uploadId from query params or session
  - [x] Show success toast after download completes
  - [x] Handle error states gracefully

- [x] **Task 3: Create useDownload hook** (AC: 1, 2, 3) - INTEGRATED IN COMPONENT
  - [x] Download logic integrated directly in DownloadButton
  - [x] Call `GET /api/download/:uploadId` with session token
  - [x] Return download URL and metadata
  - [x] Handle loading/error states

- [x] **Task 4: Add PostHog tracking** (AC: 5)
  - [x] Track `download_clicked` event on button click
  - [x] Include: upload_id, result_id, source
  - [x] Track `download_completed` after successful download
  - [x] Track `download_failed` on errors

- [x] **Task 5: Create download index export** (AC: 1)
  - [x] Create `apps/web/src/components/download/index.ts`
  - [x] Export DownloadButton component

- [x] **Task 6: Write tests**
  - [x] Unit test: Button shows loading state
  - [x] Unit test: Button triggers download with correct filename
  - [x] Unit test: Success callback fires after download
  - [x] Unit test: PostHog events are tracked

## Dev Notes

### Architecture Compliance

- **Component Pattern:** Functional component with hooks
- **State Management:** Local state + TanStack Query for API call
- **Analytics:** PostHog event tracking
- **Styling:** Tailwind + shadcn/ui Button

### Existing Code to Leverage

**checkout-success.tsx placeholder** (apps/web/src/routes/checkout-success.tsx):
```typescript
{/* Download button - placeholder for Story 7.x */}
<Button
  size="lg"
  className="w-full bg-coral hover:bg-coral/90 text-white font-body text-lg py-6"
  onClick={() => {
    // TODO: Implement actual download in Story 7.x
  }}
>
  Download HD Portrait
</Button>
```

**Session token pattern** (apps/web/src/lib/session.ts):
```typescript
export const getSession = (uploadId: string): string | null => {
  try {
    return localStorage.getItem(`babypeek-session-${uploadId}`)
  } catch {
    return null
  }
}
```

### DownloadButton Component Implementation

```typescript
// apps/web/src/components/download/DownloadButton.tsx
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2, CheckCircle } from "lucide-react"
import { posthog, isPostHogConfigured } from "@/lib/posthog"
import { API_BASE_URL } from "@/lib/api-config"

interface DownloadButtonProps {
  uploadId: string
  sessionToken: string
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
}

type DownloadState = "idle" | "fetching" | "downloading" | "success" | "error"

export function DownloadButton({
  uploadId,
  sessionToken,
  onSuccess,
  onError,
  className,
}: DownloadButtonProps) {
  const [state, setState] = useState<DownloadState>("idle")
  const [progress, setProgress] = useState(0)

  const handleDownload = useCallback(async () => {
    // AC-5: Track download clicked
    if (isPostHogConfigured()) {
      posthog.capture("download_clicked", {
        upload_id: uploadId,
        source: "in_app",
      })
    }

    setState("fetching")

    try {
      // Fetch download URL from API
      const response = await fetch(`${API_BASE_URL}/api/download/${uploadId}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || "Failed to get download link")
      }

      const data = await response.json()
      const { downloadUrl, suggestedFilename } = data

      setState("downloading")

      // AC-3: Generate filename with date
      const filename = suggestedFilename || 
        `babypeek-baby-${new Date().toISOString().split('T')[0]}.jpg`

      // Trigger download via hidden anchor
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // AC-4: Show success state
      setState("success")

      // Track completion
      if (isPostHogConfigured()) {
        posthog.capture("download_completed", {
          upload_id: uploadId,
          source: "in_app",
        })
      }

      onSuccess?.()

      // Reset to idle after showing success
      setTimeout(() => setState("idle"), 3000)

    } catch (error) {
      setState("error")

      // Track failure
      if (isPostHogConfigured()) {
        posthog.capture("download_failed", {
          upload_id: uploadId,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }

      onError?.(error instanceof Error ? error.message : "Download failed")

      // Reset to idle after error
      setTimeout(() => setState("idle"), 3000)
    }
  }, [uploadId, sessionToken, onSuccess, onError])

  const buttonContent = {
    idle: (
      <>
        <Download className="size-5 mr-2" />
        Download HD Portrait
      </>
    ),
    fetching: (
      <>
        <Loader2 className="size-5 mr-2 animate-spin" />
        Preparing download...
      </>
    ),
    downloading: (
      <>
        <Loader2 className="size-5 mr-2 animate-spin" />
        Downloading...
      </>
    ),
    success: (
      <>
        <CheckCircle className="size-5 mr-2" />
        Downloaded!
      </>
    ),
    error: (
      <>
        <Download className="size-5 mr-2" />
        Try Again
      </>
    ),
  }

  return (
    <Button
      size="lg"
      onClick={handleDownload}
      disabled={state === "fetching" || state === "downloading"}
      className={`w-full bg-coral hover:bg-coral/90 text-white font-body text-lg py-6 ${className}`}
    >
      {buttonContent[state]}
    </Button>
  )
}
```

### Updated checkout-success.tsx

```typescript
// apps/web/src/routes/checkout-success.tsx
import { DownloadButton } from "@/components/download"
import { getSession, getJobData } from "@/lib/session"
import { toast } from "sonner"

function CheckoutSuccessPage() {
  const { session_id } = Route.useSearch()
  
  // Get uploadId from session storage (stored during checkout)
  const uploadId = typeof window !== "undefined" 
    ? localStorage.getItem("babypeek-last-purchase-upload") 
    : null
  const sessionToken = uploadId ? getSession(uploadId) : null

  const handleDownloadSuccess = useCallback(() => {
    toast.success("Your HD photo has been downloaded!")
  }, [])

  const handleDownloadError = useCallback((error: string) => {
    toast.error(error || "Download failed. Please try again.")
  }, [])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* ... success icon and message ... */}

        {/* Download button - AC-1 */}
        <div className="space-y-3">
          {uploadId && sessionToken ? (
            <DownloadButton
              uploadId={uploadId}
              sessionToken={sessionToken}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          ) : (
            <p className="text-warm-gray">
              Download link will be sent to your email shortly.
            </p>
          )}

          <p className="text-sm text-warm-gray">
            You can also download from the email we sent you.
          </p>
        </div>

        {/* ... secondary actions ... */}
      </div>
    </div>
  )
}
```

### useDownload Hook (Optional)

```typescript
// apps/web/src/hooks/use-download.ts
import { useState, useCallback } from "react"
import { API_BASE_URL } from "@/lib/api-config"

interface DownloadResult {
  downloadUrl: string
  expiresAt: string
  suggestedFilename: string
}

export function useDownload(uploadId: string, sessionToken: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DownloadResult | null>(null)

  const fetchDownloadUrl = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/download/${uploadId}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || "Failed to get download link")
      }

      const result = await response.json()
      setData(result)
      return result

    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed"
      setError(message)
      throw err

    } finally {
      setIsLoading(false)
    }
  }, [uploadId, sessionToken])

  return { fetchDownloadUrl, isLoading, error, data }
}
```

### File Structure

```
apps/web/src/components/download/
├── DownloadButton.tsx       <- NEW: Download button component
├── index.ts                 <- NEW: Exports

apps/web/src/hooks/
├── use-download.ts          <- NEW: Download hook (optional)

apps/web/src/routes/
├── checkout-success.tsx     <- UPDATE: Use DownloadButton
```

### Dependencies

- **Story 7.1 (HD Retrieval):** API endpoint for download URL
- **Story 7.2 (Signed URLs):** Returns URL with expiry
- **lucide-react:** Icons (already installed)
- **sonner:** Toast notifications (already installed)

### What This Enables

- Story 7.5: Re-download page uses same component
- Story 7.6: Download tracking via PostHog events

### Mobile Considerations

- Download via anchor tag works on iOS/Android
- May prompt "Open in Safari" on iOS for downloads
- Consider using `navigator.share` as fallback for mobile

### References

- [Source: _bmad-output/epics.md#Story 7.3] - In-App Download Button requirements
- [Source: _bmad-output/prd.md#FR-5.5] - In-app download button requirement
- [Source: apps/web/src/routes/checkout-success.tsx] - Current placeholder
- [Source: _bmad-output/ux-design-specification.md] - Button styling

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None - implementation completed without issues.

### Completion Notes List

- ✅ Created DownloadButton component with loading states (idle, fetching, downloading, success, error)
- ✅ Integrated PostHog tracking: download_clicked, download_completed, download_failed
- ✅ Updated checkout-success.tsx to use DownloadButton with session token retrieval
- ✅ Updated CheckoutButton to store uploadId in localStorage for checkout-success page access
- ✅ useDownload hook was deemed unnecessary - download logic integrated directly into DownloadButton
- ✅ All 13 unit tests passing for DownloadButton
- ✅ Full web regression suite passes (526 tests)

### Code Review Fixes Applied (2024-12-21)

- ✅ Added `resultId` prop to DownloadButton for complete AC-5 compliance
- ✅ Added `result_id` to all PostHog events (download_clicked, download_completed, download_failed)
- ✅ Fixed error state UX - no longer auto-resets, user must click to retry
- ✅ Added localStorage cleanup after successful download
- ✅ Staged download folder in git (was untracked)
- ✅ Added test for error state persistence

### File List

**New Files:**
- apps/web/src/components/download/DownloadButton.tsx
- apps/web/src/components/download/DownloadButton.test.tsx
- apps/web/src/components/download/index.ts

**Modified Files:**
- apps/web/src/routes/checkout-success.tsx (replaced placeholder with DownloadButton)
- apps/web/src/components/payment/CheckoutButton.tsx (store uploadId for checkout-success)

### Change Log

- 2024-12-21: Story 7.3 implementation complete - In-App Download Button with full test coverage
- 2024-12-21: Code review fixes applied - Added resultId tracking, fixed error UX, added localStorage cleanup
