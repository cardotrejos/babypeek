# Story 8.1: WhatsApp Share Button

Status: done

## Story

As a **user**,
I want **to share my result directly to WhatsApp**,
so that **my family can see it instantly**.

## Acceptance Criteria

1. **AC-1:** Given I'm viewing my result, when I tap the WhatsApp share button (FR-6.1), then WhatsApp opens with a pre-filled message
2. **AC-2:** The message includes the share link (3d-ultra.com/share/{shareId})
3. **AC-3:** share_clicked event is sent to PostHog with platform="whatsapp"
4. **AC-4:** Button uses WhatsApp brand green color (#25D366) for recognition
5. **AC-5:** Works on both mobile (opens WhatsApp app) and desktop (opens WhatsApp Web)

## Tasks / Subtasks

- [x] **Task 1: Create ShareButtons component** (AC: 1, 4)
  - [x] Create `apps/web/src/components/share/ShareButtons.tsx`
  - [x] Implement WhatsApp share button with brand icon
  - [x] Use WhatsApp green (#25D366) for button styling
  - [x] Make button 48px minimum touch target

- [x] **Task 2: Implement WhatsApp share URL** (AC: 1, 2, 5)
  - [x] Generate share URL: `https://3d-ultra.com/share/${uploadId}`
  - [x] Construct WhatsApp URL: `https://wa.me/?text=${encodeURIComponent(message)}`
  - [x] Pre-filled message: "Look at this AI baby portrait I created! 👶✨ {shareUrl}"
  - [x] Use `window.open()` to open WhatsApp

- [x] **Task 3: Add analytics tracking** (AC: 3)
  - [x] Track `share_clicked` event with platform="whatsapp"
  - [x] Include upload_id and result_id in event
  - [x] Add Sentry breadcrumb for share action

- [x] **Task 4: Integrate into RevealUI** (AC: 1, 4)
  - [x] Import ShareButtons in `apps/web/src/components/reveal/RevealUI.tsx`
  - [x] Add share section below purchase/download buttons
  - [x] Pass uploadId prop for share URL generation

- [x] **Task 5: Write tests**
  - [x] Unit test: Generates correct WhatsApp URL
  - [x] Unit test: Encodes message properly
  - [x] Unit test: Tracks PostHog event

## Dev Notes

### Architecture Compliance

- **Component Pattern:** React functional component with hooks
- **Analytics:** PostHog event tracking
- **Touch Target:** 48px minimum per accessibility requirements

### Existing Code to Leverage

**RevealUI handleShare placeholder** (apps/web/src/routes/result.$resultId.tsx):
```typescript
const handleShare = useCallback(() => {
  if (isPostHogConfigured()) {
    posthog.capture("share_clicked", {
      result_id: resultId,
      source: "reveal_ui",
    })
  }
  // TODO: Implement share functionality when Epic 8 is implemented
}, [resultId])
```

**PostHog tracking pattern** (already in use):
```typescript
if (isPostHogConfigured()) {
  posthog.capture("share_clicked", {
    result_id: resultId,
    platform: "whatsapp",
    source: "reveal_ui",
  })
}
```

### ShareButtons Implementation

```typescript
// apps/web/src/components/share/ShareButtons.tsx
import { useCallback } from "react"
import { posthog, isPostHogConfigured } from "@/lib/posthog"
import { addBreadcrumb } from "@/lib/sentry"

interface ShareButtonsProps {
  uploadId: string
  resultId: string
}

export function ShareButtons({ uploadId, resultId }: ShareButtonsProps) {
  const shareUrl = `https://3d-ultra.com/share/${uploadId}`
  const shareMessage = `Look at this AI baby portrait I created! 👶✨ ${shareUrl}`

  const handleWhatsAppShare = useCallback(() => {
    // Track analytics
    if (isPostHogConfigured()) {
      posthog.capture("share_clicked", {
        result_id: resultId,
        upload_id: uploadId,
        platform: "whatsapp",
      })
    }
    addBreadcrumb("Share clicked", "user", { platform: "whatsapp" })

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
    window.open(whatsappUrl, "_blank", "noopener,noreferrer")
  }, [shareMessage, resultId, uploadId])

  return (
    <div className="flex gap-3 justify-center">
      <button
        onClick={handleWhatsAppShare}
        className="flex items-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-lg hover:bg-[#25D366]/90 transition-colors min-h-[48px]"
        aria-label="Share to WhatsApp"
      >
        <WhatsAppIcon className="size-5" />
        <span className="font-body">WhatsApp</span>
      </button>
    </div>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

export default ShareButtons
```

### Response Format

**WhatsApp URL Format:**
```
https://wa.me/?text=Look%20at%20this%20AI%20baby%20portrait%20I%20created!%20%F0%9F%91%B6%E2%9C%A8%20https%3A%2F%2F3d-ultra.com%2Fshare%2F{uploadId}
```

### File Structure

```
apps/web/src/components/share/
├── ShareButtons.tsx       <- NEW: Share buttons component
├── index.ts               <- NEW: Barrel export

apps/web/src/components/reveal/
├── RevealUI.tsx           <- UPDATE: Add ShareButtons
```

### Dependencies

- **Story 8.3 (Copy Link):** Will be added to same ShareButtons component
- **Story 8.4 (Share Page):** Receives users from this share action

### Parallel Work

Can be developed in parallel with:
- Story 8.2 (iMessage Share)
- Story 8.3 (Copy Link)

### References

- [Source: _bmad-output/epics.md#Story 8.1] - WhatsApp share requirements
- [Source: _bmad-output/prd.md#FR-6.1] - WhatsApp share requirement
- [Source: apps/web/src/routes/result.$resultId.tsx] - Existing share handler placeholder

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- All web tests pass including 26 ShareButtons tests (8.1 + 8.2 + 8.3 combined)
- No linting errors

### Completion Notes List

- Created ShareButtons component with WhatsApp share functionality
- Implemented correct WhatsApp URL format: `https://wa.me/?text={encoded_message}`
- Share message includes emoji-encoded text with share URL
- PostHog analytics tracks share_clicked with platform="whatsapp"
- Sentry breadcrumb added for share action debugging
- Button uses WhatsApp brand green (#25D366) with 48px min touch target
- Integrated into RevealUI with dedicated "Share your portrait" section
- Updated RevealUI tests to handle multiple share buttons
- 5 unit tests verify WhatsApp URL generation, encoding, analytics, accessibility
- Note: ShareButtons.tsx now contains Stories 8.1, 8.2, 8.3 combined (26 total tests)

### File List

- apps/web/src/components/share/ShareButtons.tsx (NEW)
- apps/web/src/components/share/ShareButtons.test.tsx (NEW)
- apps/web/src/components/share/index.ts (NEW)
- apps/web/src/components/reveal/RevealUI.tsx (MODIFIED)
- apps/web/src/components/reveal/RevealUI.test.tsx (MODIFIED)
