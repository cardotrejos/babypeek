# Story 8.2: iMessage Share Button

Status: done

## Story

As a **user**,
I want **to share my result via iMessage**,
so that **I can reach family who use iPhones**.

## Acceptance Criteria

1. **AC-1:** Given I'm viewing my result on iOS, when I tap the iMessage share button (FR-6.2), then Messages opens with a pre-filled message
2. **AC-2:** The message includes the share link
3. **AC-3:** share_clicked event is sent to PostHog with platform="imessage"
4. **AC-4:** Button uses iOS Messages blue color for recognition
5. **AC-5:** On non-iOS devices, button falls back to generic SMS or is hidden

## Tasks / Subtasks

- [x] **Task 1: Detect iOS device** (AC: 1, 5)
  - [x] Create `apps/web/src/lib/device-detection.ts`
  - [x] Implement `isIOS()` function using navigator.userAgent
  - [x] Detect iPad, iPhone, and iPod touch

- [x] **Task 2: Add iMessage button to ShareButtons** (AC: 1, 4)
  - [x] Update `apps/web/src/components/share/ShareButtons.tsx`
  - [x] Add iMessage button with Messages icon
  - [x] Use iOS blue color (#007AFF)
  - [x] Conditionally show based on iOS detection

- [x] **Task 3: Implement iMessage/SMS URL** (AC: 1, 2)
  - [x] Generate share URL: `https://babypeek.com/share/${uploadId}`
  - [x] iOS: Use `sms:&body=${encodeURIComponent(message)}`
  - [x] Non-iOS fallback: Use generic SMS URL (`sms:?body=`)

- [x] **Task 4: Add analytics tracking** (AC: 3)
  - [x] Track `share_clicked` event with platform="imessage" or platform="sms"
  - [x] Include device_type in event (ios/android/desktop)

- [x] **Task 5: Write tests**
  - [x] Unit test: iOS detection logic (21 tests with mocked navigator)
  - [x] Unit test: Correct SMS URL format
  - [x] Unit test: PostHog event fires (26 ShareButtons tests)

## Dev Notes

### Architecture Compliance

- **Component Pattern:** Add to existing ShareButtons component
- **Analytics:** PostHog event tracking with platform discrimination
- **Progressive Enhancement:** Falls back gracefully on non-iOS

### iOS Detection

```typescript
// apps/web/src/lib/device-detection.ts
export function isIOS(): boolean {
  if (typeof window === "undefined") return false
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

export function isAndroid(): boolean {
  if (typeof window === "undefined") return false
  return /Android/.test(navigator.userAgent)
}

export function isMobile(): boolean {
  return isIOS() || isAndroid()
}
```

### iMessage Button Implementation

```typescript
// Add to ShareButtons.tsx
const handleIMessageShare = useCallback(() => {
  const deviceType = isIOS() ? "ios" : isAndroid() ? "android" : "desktop"
  
  if (isPostHogConfigured()) {
    posthog.capture("share_clicked", {
      result_id: resultId,
      upload_id: uploadId,
      platform: isIOS() ? "imessage" : "sms",
      device_type: deviceType,
    })
  }
  addBreadcrumb("Share clicked", "user", { platform }) // Dynamic platform

  // iOS uses sms: URL scheme which opens iMessage
  // The & without number opens new message composer
  const smsUrl = `sms:&body=${encodeURIComponent(shareMessage)}`
  window.location.href = smsUrl
}, [shareMessage, resultId, uploadId])

// In component JSX - only show on mobile
{isMobile() && (
  <button
    onClick={handleIMessageShare}
    className="flex items-center gap-2 px-4 py-3 bg-[#007AFF] text-white rounded-lg hover:bg-[#007AFF]/90 transition-colors min-h-[48px]"
    aria-label={isIOS() ? "Share via iMessage" : "Share via SMS"}
  >
    <MessageIcon className="size-5" />
    <span className="font-body">{isIOS() ? "iMessage" : "Message"}</span>
  </button>
)}
```

### SMS URL Formats

**iOS (iMessage):**
```
sms:&body=Look%20at%20this%20AI%20baby%20portrait!%20https%3A%2F%2Fbabypeek.com%2Fshare%2F{uploadId}
```

**Note:** iOS uses `sms:&body=` (ampersand) while Android uses `sms:?body=` (question mark)

### File Structure

```
apps/web/src/lib/
├── device-detection.ts    <- NEW: Device detection utilities

apps/web/src/components/share/
├── ShareButtons.tsx       <- UPDATE: Add iMessage button
```

### Platform Behavior

| Platform | Button Label | Opens | URL Scheme |
|----------|--------------|-------|------------|
| iOS | iMessage | Messages app | `sms:&body=` |
| Android | Message | SMS app | `sms:?body=` |
| Desktop | Hidden | N/A | N/A |

### Dependencies

- **Story 8.1 (WhatsApp):** Uses same ShareButtons component
- **Story 8.3 (Copy Link):** Provides desktop sharing alternative

### Parallel Work

Can be developed in parallel with:
- Story 8.1 (WhatsApp Share)
- Story 8.3 (Copy Link)

### References

- [Source: _bmad-output/epics.md#Story 8.2] - iMessage share requirements
- [Source: _bmad-output/prd.md#FR-6.2] - iMessage share requirement
- [Source: _bmad-output/ux-design-specification.md] - Native share sheet integration

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

N/A - Implementation proceeded without issues

### Completion Notes List

- Created device detection utility with `isIOS()`, `isAndroid()`, `isMobile()`, and `getDeviceType()` functions
- Added iMessage/SMS button to ShareButtons component with:
  - iOS blue color (#007AFF)
  - Conditional rendering based on mobile detection
  - Platform-specific SMS URL formats (& for iOS, ? for Android)
  - Label changes based on platform ("iMessage" vs "Message")
- Implemented PostHog analytics with platform and device_type discrimination
- Added Sentry breadcrumbs for share actions
- All 47 tests pass (21 device detection + 26 ShareButtons tests)
- Full test suite passes (563 tests) with no regressions

### File List

- `apps/web/src/lib/device-detection.ts` (NEW)
- `apps/web/src/lib/device-detection.test.ts` (NEW)
- `apps/web/src/components/share/ShareButtons.tsx` (NEW)
- `apps/web/src/components/share/ShareButtons.test.tsx` (NEW)
- `apps/web/src/components/share/index.ts` (NEW)

## Change Log

| Date | Change |
|------|--------|
| 2025-12-21 | Story implementation complete - all ACs satisfied |
| 2025-12-21 | Code review: improved device detection tests to mock navigator, added index.ts to File List |
