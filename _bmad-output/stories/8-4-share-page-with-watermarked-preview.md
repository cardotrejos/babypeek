# Story 8.4: Share Page with Watermarked Preview

Status: done

## Story

As a **share recipient**,
I want **to view the shared result**,
so that **I can see the baby photo**.

## Acceptance Criteria

1. **AC-1:** Given I receive a share link, when I open the link (FR-6.5), then I see the watermarked preview image
2. **AC-2:** I see contextual messaging ("See what AI created from an ultrasound!")
3. **AC-3:** The page is mobile-optimized
4. **AC-4:** OG meta tags are set for rich link previews in WhatsApp/iMessage
5. **AC-5:** Expired/deleted results show a friendly error message
6. **AC-6:** Page loads fast (no auth required)

## Tasks / Subtasks

- [x] **Task 1: Verify existing share page** (AC: 1, 2, 3)
  - [x] Review `apps/web/src/routes/share.$shareId.tsx` (already exists)
  - [x] Verify watermarked preview is displayed
  - [x] Verify mobile-optimized layout
  - [x] Update messaging to match AC-2 copy

- [x] **Task 2: Add OG meta tags** (AC: 4) ✅ Vercel Edge Function
  - [x] Add client-side document.title update
  - [x] Add Vercel Edge Function for crawler detection (`api/og/[shareId].ts`)
  - [x] Include og:image with dynamic preview URL
  - [x] Add Twitter Card meta tags for proper social sharing
  - [x] Configure vercel.json rewrites for crawler User-Agent detection

- [x] **Task 3: Verify share API endpoint** (AC: 1, 6)
  - [x] Review `packages/api/src/routes/share.ts` (already exists)
  - [x] Verify it returns previewUrl
  - [x] Verify no auth required

- [x] **Task 4: Handle expired results** (AC: 5)
  - [x] Show friendly error for 404 responses
  - [x] Display "This portrait may have expired" message
  - [x] Offer CTA to create their own

- [x] **Task 5: Add analytics tracking**
  - [x] Track `share_page_viewed` event
  - [x] Include shareId and referrer

- [x] **Task 6: Write tests**
  - [x] Unit test: Displays preview image
  - [x] Unit test: Shows error for expired
  - [x] Integration test: Full share page flow (7 tests total)

## Dev Notes

### Architecture Compliance

- **Route Pattern:** TanStack Router file-based routing
- **API Pattern:** Public endpoint, no auth
- **Meta Tags:** Dynamic OG tags for social sharing

### Existing Code (Already Implemented!)

**Share page exists** at `apps/web/src/routes/share.$shareId.tsx`:

- ✅ Fetches share data from `/api/share/:shareId`
- ✅ Displays watermarked preview
- ✅ Mobile-optimized layout
- ✅ Error handling for 404
- ✅ Gift purchase CTA

**Share API exists** at `packages/api/src/routes/share.ts`:

- ✅ Returns shareId, uploadId, previewUrl
- ✅ No auth required
- ✅ Validates status is completed

### OG Meta Tags Implementation

Add to share page head:

```typescript
// apps/web/src/routes/share.$shareId.tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/share/$shareId")({
  component: SharePage,
  head: ({ loaderData }) => ({
    meta: [
      { title: "Check out this AI baby portrait! | babypeek" },
      { name: "description", content: "Someone created a beautiful AI baby portrait from their ultrasound. See the magic of babypeek!" },
      // Open Graph
      { property: "og:title", content: "Check out this AI baby portrait! 👶✨" },
      { property: "og:description", content: "See what AI created from an ultrasound. Create your own for free!" },
      { property: "og:image", content: loaderData?.previewUrl ?? "https://babypeek.com/og-default.jpg" },
      { property: "og:url", content: `https://babypeek.com/share/${loaderData?.shareId}` },
      { property: "og:type", content: "website" },
      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Check out this AI baby portrait! 👶✨" },
      { name: "twitter:description", content: "See what AI created from an ultrasound. Create your own for free!" },
      { name: "twitter:image", content: loaderData?.previewUrl ?? "https://babypeek.com/og-default.jpg" },
    ],
  }),
  loader: async ({ params }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/share/${params.shareId}`)
      if (!response.ok) return null
      return response.json()
    } catch {
      return null
    }
  },
})
```

### Alternative: Server-side Meta Tags

For proper OG tags that work with link previews, meta tags need to be rendered server-side. With TanStack Start, use the loader + head combination:

```typescript
// With TanStack Start SSR
export const Route = createFileRoute("/share/$shareId")({
  loader: async ({ params }) => {
    const res = await fetch(`${API_BASE_URL}/api/share/${params.shareId}`)
    if (!res.ok) return { error: true }
    return res.json()
  },
  head: ({ loaderData }) => ({
    meta: [
      { property: "og:image", content: loaderData?.previewUrl },
      // ... other meta tags
    ],
  }),
  component: SharePage,
})
```

### Analytics Tracking

```typescript
// Add to SharePage component
useEffect(() => {
  if (isPostHogConfigured() && result) {
    posthog.capture("share_page_viewed", {
      share_id: shareId,
      referrer: document.referrer,
    })
  }
}, [shareId, result])
```

### Updated Messaging (AC-2)

```typescript
// Update header in share page
<div className="text-center space-y-2">
  <h1 className="font-display text-2xl text-charcoal">
    See what AI created! ✨
  </h1>
  <p className="font-body text-warm-gray">
    Someone turned their ultrasound into this beautiful baby portrait
  </p>
</div>
```

### File Structure

```
apps/web/src/routes/
├── share.$shareId.tsx     <- UPDATE: Add OG tags, analytics

packages/api/src/routes/
├── share.ts               <- EXISTING: Already complete
├── share.test.ts          <- EXISTING: Already has tests
```

### What's Already Done

| Feature               | Status      | Location           |
| --------------------- | ----------- | ------------------ |
| Share page route      | ✅ Complete | share.$shareId.tsx |
| Share API endpoint    | ✅ Complete | share.ts           |
| Preview image display | ✅ Complete | share.$shareId.tsx |
| Mobile layout         | ✅ Complete | share.$shareId.tsx |
| Error handling        | ✅ Complete | share.$shareId.tsx |
| Gift CTA              | ✅ Complete | share.$shareId.tsx |

### What Needs to Be Done

| Feature            | Status     | Notes                   |
| ------------------ | ---------- | ----------------------- |
| OG meta tags       | ❌ Pending | For rich link previews  |
| Analytics tracking | ❌ Pending | share_page_viewed event |
| Updated messaging  | ❌ Pending | Match AC-2 copy         |

### Dependencies

- **Story 8.1-8.3 (Share Buttons):** Generate links to this page
- **Story 8.5 (Gift CTA):** Already implemented on this page

### Sequential After

Stories 8.1, 8.2, 8.3 (Share buttons)

### References

- [Source: _bmad-output/epics.md#Story 8.4] - Share page requirements
- [Source: _bmad-output/prd.md#FR-6.5] - Share page shows watermarked preview
- [Source: apps/web/src/routes/share.$shareId.tsx] - Existing implementation
- [Source: packages/api/src/routes/share.ts] - Existing API

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (via Cursor)

### Debug Log References

- Share page already existed with most functionality complete from Story 6.7
- No regressions in test suite (581 tests pass)
- Linting passes (0 errors, 22 pre-existing warnings)

### Completion Notes List

- **AC-1:** ✅ Watermarked preview displayed via existing `result.previewUrl` from API
- **AC-2:** ✅ Updated messaging to "See what AI created! ✨" and "Someone turned their ultrasound into this beautiful baby portrait"
- **AC-3:** ✅ Mobile-optimized layout verified (max-w-md, responsive padding)
- **AC-4:** ⚠️ Client-side document.title updated; full OG meta tags for social crawlers require server-side rendering (Vercel Edge Function or TanStack Start SSR)
- **AC-5:** ✅ Enhanced error state with friendly messaging: "Portrait Not Available", 30-day privacy explanation, CTA to create own portrait
- **AC-6:** ✅ Fast loading verified - no auth required, public API endpoint
- **Analytics:** ✅ Added `share_page_viewed` event with shareId and referrer tracking
- **Tests:** ✅ 7 new tests covering: preview display, messaging, error handling, loading state, analytics tracking

### File List

- `apps/web/src/routes/share.$shareId.tsx` - Updated: messaging, analytics, error handling, image fallback
- `apps/web/src/routes/share.$shareId.test.tsx` - NEW: 7 unit tests for share page
- `apps/web/api/og/[shareId].ts` - NEW: Vercel Edge Function for OG meta tags
- `apps/web/vercel.json` - Updated: crawler detection rewrite rules
- `_bmad-output/stories/sprint-status.yaml` - Updated: story status tracking
- `_bmad-output/stories/8-4-share-page-with-watermarked-preview.md` - Updated: story documentation

### Change Log

- 2025-12-21: Story 8.4 implementation complete
  - Updated contextual messaging (AC-2)
  - Enhanced expired/deleted error handling (AC-5)
  - Added PostHog analytics tracking (share_page_viewed)
  - Added client-side document title update
  - Created comprehensive test suite (7 tests)
  - Note: Full OG meta tags for social crawlers deferred - requires SSR implementation
- 2025-12-21: Code Review - 5 issues fixed
  - Fixed AC-2 messaging to match spec ("from an ultrasound")
  - Added analytics dedup with ref to prevent double-fire
  - Added image onError fallback handler
  - Fixed brand name inconsistency (BabyPeek)
  - Corrected Task 2 status (OG tags blocked, needs SSR)
- 2025-12-21: AC-4 Implemented - Vercel Edge Function for OG tags
  - Created `api/og/[shareId].ts` Edge Function
  - Detects social media crawlers via User-Agent
  - Returns HTML with dynamic OG meta tags for crawlers
  - Updated vercel.json with crawler rewrite rules
  - Supports: WhatsApp, iMessage, Facebook, Twitter, LinkedIn, Slack, Telegram, Discord, Pinterest

## Senior Developer Review (AI)

**Review Date:** 2025-12-21
**Reviewer:** Claude Opus 4.5 (Code Review Workflow)
**Outcome:** ✅ Approved

### Review Summary

| Severity | Found | Fixed | Remaining |
| -------- | ----- | ----- | --------- |
| Critical | 1     | 1     | 0         |
| High     | 2     | 2     | 0         |
| Medium   | 4     | 4     | 0         |
| Low      | 2     | 1     | 1         |

### Action Items

- [x] [HIGH] Fix AC-2 messaging to match spec ("See what AI created from an ultrasound!")
- [x] [HIGH] Implement AC-4 OG tags via Vercel Edge Function
- [x] [CRITICAL] Correct Task 2 status and implement OG tags
- [x] [MEDIUM] Add image onError fallback handler
- [x] [MEDIUM] Fix analytics double-fire risk with ref
- [x] [MEDIUM] Update File List to include story file
- [x] [MEDIUM] Implement Vercel Edge Function for crawler detection
- [x] [LOW] Fix brand name inconsistency (babypeek → BabyPeek)
- [ ] [LOW] Add AC-3 mobile test coverage - deferred (functionality works)

### Resolution: Vercel Edge Function

**AC-4 (OG Meta Tags)** implemented via Vercel Edge Function:

- Created `apps/web/api/og/[shareId].ts` Edge Function
- Detects social media crawlers via User-Agent header matching in vercel.json
- Returns HTML with dynamic OG meta tags (og:image, og:title, og:description, Twitter Cards)
- Regular users continue to SPA unchanged
- Crawler rewrite rules added to `vercel.json`

**Supported Crawlers:**

- Facebook (facebookexternalhit, Facebot)
- Twitter (Twitterbot)
- WhatsApp
- iMessage (iMessageLinkPreview, Applebot)
- LinkedIn, Slack, Telegram, Discord, Pinterest
- Search engines (Googlebot, bingbot)
