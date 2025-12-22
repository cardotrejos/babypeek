# Story 8.8: Expired Result Handling

Status: ready-for-dev

## Story

As a **user**,
I want **a clear message if my result has expired**,
so that **I understand why I can't access it**.

## Acceptance Criteria

1. **AC-1:** Given my result was deleted after 30 days, when I try to access the result page, then I see a warm message ("This photo has expired after 30 days")
2. **AC-2:** I see a CTA to create a new photo
3. **AC-3:** The page doesn't show a broken image or error
4. **AC-4:** Same experience for expired share links
5. **AC-5:** Analytics track expired page views

## Tasks / Subtasks

- [ ] **Task 1: Update result page error handling** (AC: 1, 2, 3)
  - [ ] Update `apps/web/src/routes/result.$resultId.tsx`
  - [ ] Detect 404 response (expired/deleted)
  - [ ] Show friendly expired message
  - [ ] Add "Create Your Own" CTA

- [ ] **Task 2: Update share page error handling** (AC: 4)
  - [ ] Verify `apps/web/src/routes/share.$shareId.tsx` handles 404
  - [ ] Show consistent expired message
  - [ ] Offer "Try it Free" CTA

- [ ] **Task 3: Create ExpiredResult component** (AC: 1, 2, 3)
  - [ ] Create reusable expired state component
  - [ ] Warm, friendly messaging
  - [ ] Visual design matching brand

- [ ] **Task 4: Add analytics tracking** (AC: 5)
  - [ ] Track `expired_result_viewed` event
  - [ ] Include result_id and source (result/share)

- [ ] **Task 5: Write tests**
  - [ ] Unit test: Expired message displays
  - [ ] Unit test: CTA navigates to home
  - [ ] Integration test: Full expired flow

## Dev Notes

### Architecture Compliance

- **Error Handling:** Warm user-facing copy
- **Component Pattern:** Reusable expired state
- **Analytics:** PostHog event tracking

### ExpiredResult Component

```typescript
// apps/web/src/components/states/ExpiredResult.tsx
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { useEffect } from "react"
import { posthog, isPostHogConfigured } from "@/lib/posthog"

interface ExpiredResultProps {
  resultId?: string
  source: "result" | "share"
}

export function ExpiredResult({ resultId, source }: ExpiredResultProps) {
  const navigate = useNavigate()

  // Track expired page view
  useEffect(() => {
    if (isPostHogConfigured()) {
      posthog.capture("expired_result_viewed", {
        result_id: resultId,
        source,
      })
    }
  }, [resultId, source])

  const handleCreateNew = () => {
    navigate({ to: "/" })
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Warm visual */}
        <div className="flex justify-center">
          <div className="size-20 rounded-full bg-coral/10 flex items-center justify-center">
            <span className="text-4xl">🌅</span>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="font-display text-2xl text-charcoal">
            This photo has moved on
          </h1>
          <p className="font-body text-warm-gray leading-relaxed">
            Photos are automatically deleted after 30 days to protect your privacy.
            The good news? You can create a new one anytime!
          </p>
        </div>

        {/* Privacy reassurance */}
        <div className="bg-white rounded-xl p-4 text-left">
          <p className="text-sm text-warm-gray">
            <span className="text-coral font-medium">Why we do this:</span> Your
            ultrasound images are personal. We delete them automatically so you
            don't have to worry about your data sitting on our servers.
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Button
            onClick={handleCreateNew}
            className="w-full py-4 bg-coral text-white rounded-xl hover:bg-coral/90"
          >
            Create a New Portrait ✨
          </Button>
          <p className="text-xs text-warm-gray/60">
            It only takes 90 seconds
          </p>
        </div>
      </div>
    </div>
  )
}
```

### Update Result Page

```typescript
// apps/web/src/routes/result.$resultId.tsx
import { ExpiredResult } from "@/components/states/ExpiredResult"

// In the error handling section
if (queryError) {
  // Check if it's an expiration (404)
  const isExpired = queryError instanceof Error && 
    (queryError.message.includes("not found") || 
     queryError.message.includes("Result not found"))

  if (isExpired) {
    return <ExpiredResult resultId={resultId} source="result" />
  }

  // Other error handling...
}
```

### Update Share Page

The share page already handles 404 errors. Update the error message:

```typescript
// apps/web/src/routes/share.$shareId.tsx
// In the error state section
if (error || !result) {
  const isExpired = error instanceof Error && 
    error.message.includes("no longer available")

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="size-16 rounded-full bg-coral/10 flex items-center justify-center">
            <span className="text-3xl">🌅</span>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl text-charcoal">
            {isExpired ? "This photo has moved on" : "Portrait Not Found"}
          </h1>
          <p className="font-body text-warm-gray">
            {isExpired 
              ? "Photos are automatically deleted after 30 days to protect privacy."
              : "This portrait may have expired or been removed."}
          </p>
        </div>
        <Button onClick={handleGoHome}>
          Create Your Own
        </Button>
      </div>
    </div>
  )
}
```

### Expired Detection Logic

Detect expired vs other errors:

```typescript
// apps/web/src/lib/error-detection.ts
export function isExpiredError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  
  const expiredMessages = [
    "not found",
    "no longer available", 
    "expired",
    "Result not found",
  ]
  
  return expiredMessages.some((msg) => 
    error.message.toLowerCase().includes(msg.toLowerCase())
  )
}
```

### File Structure

```
apps/web/src/components/states/
├── ExpiredResult.tsx    <- NEW: Expired state component
├── index.ts             <- NEW: Barrel export

apps/web/src/lib/
├── error-detection.ts   <- NEW: Error type detection

apps/web/src/routes/
├── result.$resultId.tsx <- UPDATE: Use ExpiredResult
├── share.$shareId.tsx   <- UPDATE: Consistent expired message
```

### Warm Messaging Variants

| Context | Message |
|---------|---------|
| Result Page | "This photo has moved on" |
| Share Page | "This photo has moved on" |
| Explanation | "Photos are automatically deleted after 30 days to protect your privacy." |
| CTA | "Create a New Portrait ✨" |

### Analytics Events

```typescript
posthog.capture("expired_result_viewed", {
  result_id: resultId,
  source: "result" | "share",
  timestamp: new Date().toISOString(),
})
```

### Edge Cases

1. **Bookmarked old URL:** Shows expired message with CTA
2. **Share link in chat history:** Shows expired message with CTA  
3. **Email download link (30+ days):** Download endpoint returns 404, show expired

### Dependencies

- **Story 8.7 (Auto-Delete):** Creates the expired state
- **Story 8.4 (Share Page):** Receives expired share links

### Parallel Work

Can be developed in parallel with:
- Story 8.6 (Delete Button)
- Story 8.7 (Auto-Delete)

### References

- [Source: _bmad-output/epics.md#Story 8.8] - Expired handling requirements
- [Source: _bmad-output/ux-design-specification.md] - Warm error copy guidelines
- [Source: apps/web/src/routes/result.$resultId.tsx] - Result page to update
- [Source: apps/web/src/routes/share.$shareId.tsx] - Share page error handling

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
