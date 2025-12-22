# Story 8.3: Copy Link Button

Status: done

## Story

As a **user**,
I want **to copy the share link to my clipboard**,
so that **I can paste it anywhere**.

## Acceptance Criteria

1. **AC-1:** Given I'm viewing my result, when I tap "Copy Link" (FR-6.3), then the share URL is copied to clipboard
2. **AC-2:** I see confirmation toast ("Link copied!")
3. **AC-3:** The link format is `babypeek.com/share/{shareId}`
4. **AC-4:** share_clicked event is sent to PostHog with platform="copy"
5. **AC-5:** Works on all devices (mobile and desktop)
6. **AC-6:** Falls back gracefully if clipboard API unavailable

## Tasks / Subtasks

- [x] **Task 1: Add Copy Link button to ShareButtons** (AC: 1, 5)
  - [x] Update `apps/web/src/components/share/ShareButtons.tsx`
  - [x] Add "Copy Link" button with link/copy icon
  - [x] Use neutral color to not compete with branded buttons

- [x] **Task 2: Implement clipboard copy** (AC: 1, 6)
  - [x] Use `navigator.clipboard.writeText()` API
  - [x] Add fallback using `document.execCommand('copy')` for older browsers
  - [x] Handle clipboard permission errors gracefully

- [x] **Task 3: Add toast confirmation** (AC: 2)
  - [x] Use existing sonner toast library
  - [x] Show success: "Link copied!"
  - [x] Show error on failure: "Couldn't copy link. Please try again."

- [x] **Task 4: Add analytics tracking** (AC: 4)
  - [x] Track `share_clicked` event with platform="copy"
  - [x] Include copy_success boolean in event

- [x] **Task 5: Write tests**
  - [x] Unit test: Generates correct share URL
  - [x] Unit test: Clipboard API is called
  - [x] Unit test: Toast is shown on success
  - [x] Unit test: PostHog event fires

## Dev Notes

### Architecture Compliance

- **Component Pattern:** Add to existing ShareButtons component
- **Toast Pattern:** Use sonner library (already in project)
- **Progressive Enhancement:** Fallback for older browsers

### Existing Code to Leverage

**Toast library** (already installed):
```typescript
import { toast } from "sonner"

// Usage
toast.success("Link copied!")
toast.error("Couldn't copy link")
```

### Copy Link Implementation

```typescript
// Add to ShareButtons.tsx
import { toast } from "sonner"

const handleCopyLink = useCallback(async () => {
  const shareUrl = `https://babypeek.com/share/${uploadId}`
  let success = false

  try {
    // Modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl)
      success = true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = shareUrl
      textArea.style.position = "fixed"
      textArea.style.left = "-9999px"
      document.body.appendChild(textArea)
      textArea.select()
      success = document.execCommand("copy")
      document.body.removeChild(textArea)
    }

    if (success) {
      toast.success("Link copied!")
    } else {
      throw new Error("Copy failed")
    }
  } catch (error) {
    toast.error("Couldn't copy link. Please try again.")
    success = false
  }

  // Track analytics
  if (isPostHogConfigured()) {
    posthog.capture("share_clicked", {
      result_id: resultId,
      upload_id: uploadId,
      platform: "copy",
      copy_success: success,
    })
  }
  addBreadcrumb("Share clicked", "user", { platform: "copy", success })
}, [uploadId, resultId])

// Button JSX
<button
  onClick={handleCopyLink}
  className="flex items-center gap-2 px-4 py-3 bg-warm-gray/10 text-charcoal rounded-lg hover:bg-warm-gray/20 transition-colors min-h-[48px]"
  aria-label="Copy share link"
>
  <LinkIcon className="size-5" />
  <span className="font-body">Copy Link</span>
</button>
```

### Share URL Format

```
https://babypeek.com/share/{uploadId}
```

**Example:**
```
https://babypeek.com/share/clm8h2xz40001js08x7qz3k4y
```

### Complete ShareButtons Component

```typescript
// apps/web/src/components/share/ShareButtons.tsx
import { useCallback, useState } from "react"
import { toast } from "sonner"
import { posthog, isPostHogConfigured } from "@/lib/posthog"
import { addBreadcrumb } from "@/lib/sentry"
import { isIOS, isMobile, isAndroid } from "@/lib/device-detection"

interface ShareButtonsProps {
  uploadId: string
  resultId: string
}

export function ShareButtons({ uploadId, resultId }: ShareButtonsProps) {
  const shareUrl = `https://babypeek.com/share/${uploadId}`
  const shareMessage = `Look at this AI baby portrait I created! 👶✨ ${shareUrl}`

  // WhatsApp share
  const handleWhatsAppShare = useCallback(() => {
    if (isPostHogConfigured()) {
      posthog.capture("share_clicked", {
        result_id: resultId,
        upload_id: uploadId,
        platform: "whatsapp",
      })
    }
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
    window.open(whatsappUrl, "_blank", "noopener,noreferrer")
  }, [shareMessage, resultId, uploadId])

  // iMessage/SMS share (mobile only)
  const handleMessageShare = useCallback(() => {
    const platform = isIOS() ? "imessage" : "sms"
    if (isPostHogConfigured()) {
      posthog.capture("share_clicked", {
        result_id: resultId,
        upload_id: uploadId,
        platform,
      })
    }
    // iOS uses & separator, Android uses ?
    const separator = isIOS() ? "&" : "?"
    const smsUrl = `sms:${separator}body=${encodeURIComponent(shareMessage)}`
    window.location.href = smsUrl
  }, [shareMessage, resultId, uploadId])

  // Copy link
  const handleCopyLink = useCallback(async () => {
    let success = false
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl)
        success = true
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = shareUrl
        textArea.style.position = "fixed"
        textArea.style.left = "-9999px"
        document.body.appendChild(textArea)
        textArea.select()
        success = document.execCommand("copy")
        document.body.removeChild(textArea)
      }
      if (success) {
        toast.success("Link copied!")
      } else {
        throw new Error("Copy failed")
      }
    } catch {
      toast.error("Couldn't copy link. Please try again.")
    }

    if (isPostHogConfigured()) {
      posthog.capture("share_clicked", {
        result_id: resultId,
        upload_id: uploadId,
        platform: "copy",
        copy_success: success,
      })
    }
  }, [shareUrl, resultId, uploadId])

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-warm-gray font-body">Share your portrait</p>
      <div className="flex flex-wrap gap-3 justify-center">
        {/* WhatsApp - always shown */}
        <button
          onClick={handleWhatsAppShare}
          className="flex items-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-lg hover:bg-[#25D366]/90 transition-colors min-h-[48px]"
          aria-label="Share to WhatsApp"
        >
          <WhatsAppIcon className="size-5" />
          <span className="font-body">WhatsApp</span>
        </button>

        {/* iMessage/SMS - mobile only */}
        {isMobile() && (
          <button
            onClick={handleMessageShare}
            className="flex items-center gap-2 px-4 py-3 bg-[#007AFF] text-white rounded-lg hover:bg-[#007AFF]/90 transition-colors min-h-[48px]"
            aria-label={isIOS() ? "Share via iMessage" : "Share via SMS"}
          >
            <MessageIcon className="size-5" />
            <span className="font-body">{isIOS() ? "iMessage" : "Message"}</span>
          </button>
        )}

        {/* Copy Link - always shown */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-3 bg-warm-gray/10 text-charcoal rounded-lg hover:bg-warm-gray/20 transition-colors min-h-[48px]"
          aria-label="Copy share link"
        >
          <LinkIcon className="size-5" />
          <span className="font-body">Copy Link</span>
        </button>
      </div>
    </div>
  )
}
```

### File Structure

```
apps/web/src/components/share/
├── ShareButtons.tsx       <- UPDATE: Add copy functionality
├── index.ts               <- Export component
```

### Dependencies

- **Story 8.1 (WhatsApp):** Same component
- **Story 8.2 (iMessage):** Same component
- **Story 8.4 (Share Page):** Receives users who click copied links

### Parallel Work

Can be developed in parallel with:
- Story 8.1 (WhatsApp Share)
- Story 8.2 (iMessage Share)

### References

- [Source: _bmad-output/epics.md#Story 8.3] - Copy link requirements
- [Source: _bmad-output/prd.md#FR-6.3] - Copy link requirement
- [Source: apps/web/src/routes/result.$resultId.tsx] - Result page to integrate

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

None

### Completion Notes List

- Added Copy Link button to ShareButtons component with LinkIcon SVG
- Implemented clipboard copy using modern navigator.clipboard API with fallback to document.execCommand('copy') for older browsers
- Added toast notifications using sonner: "Link copied!" on success, "Couldn't copy link. Please try again." on failure
- Added PostHog analytics tracking with platform="copy" and copy_success boolean
- Button styled with neutral colors (bg-warm-gray/10, text-charcoal) to not compete with branded buttons
- 48px minimum touch target maintained for accessibility
- Added Sentry breadcrumb tracking
- All 26 ShareButtons tests pass including 7 Copy Link tests
- Full test suite passes with no regressions

### File List

- `apps/web/src/components/share/ShareButtons.tsx` - Modified: Added handleCopyLink handler, Copy Link button, and LinkIcon component
- `apps/web/src/components/share/ShareButtons.test.tsx` - Modified: Added 7 tests for Copy Link functionality
