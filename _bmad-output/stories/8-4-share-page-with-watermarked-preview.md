# Story 8.4: Share Page with Watermarked Preview

Status: ready-for-dev

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

- [ ] **Task 1: Verify existing share page** (AC: 1, 2, 3)
  - [ ] Review `apps/web/src/routes/share.$shareId.tsx` (already exists)
  - [ ] Verify watermarked preview is displayed
  - [ ] Verify mobile-optimized layout
  - [ ] Update messaging to match AC-2 copy

- [ ] **Task 2: Add OG meta tags** (AC: 4)
  - [ ] Add Open Graph meta tags for social sharing
  - [ ] Include og:image with preview URL
  - [ ] Include og:title and og:description
  - [ ] Add Twitter Card meta tags

- [ ] **Task 3: Verify share API endpoint** (AC: 1, 6)
  - [ ] Review `packages/api/src/routes/share.ts` (already exists)
  - [ ] Verify it returns previewUrl
  - [ ] Verify no auth required

- [ ] **Task 4: Handle expired results** (AC: 5)
  - [ ] Show friendly error for 404 responses
  - [ ] Display "This portrait may have expired" message
  - [ ] Offer CTA to create their own

- [ ] **Task 5: Add analytics tracking**
  - [ ] Track `share_page_viewed` event
  - [ ] Include shareId and referrer

- [ ] **Task 6: Write tests**
  - [ ] Unit test: Displays preview image
  - [ ] Unit test: Shows error for expired
  - [ ] Integration test: Full share page flow

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
      { title: "Check out this AI baby portrait! | 3d-ultra" },
      { name: "description", content: "Someone created a beautiful AI baby portrait from their ultrasound. See the magic of 3d-ultra!" },
      // Open Graph
      { property: "og:title", content: "Check out this AI baby portrait! 👶✨" },
      { property: "og:description", content: "See what AI created from an ultrasound. Create your own for free!" },
      { property: "og:image", content: loaderData?.previewUrl ?? "https://3d-ultra.com/og-default.jpg" },
      { property: "og:url", content: `https://3d-ultra.com/share/${loaderData?.shareId}` },
      { property: "og:type", content: "website" },
      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Check out this AI baby portrait! 👶✨" },
      { name: "twitter:description", content: "See what AI created from an ultrasound. Create your own for free!" },
      { name: "twitter:image", content: loaderData?.previewUrl ?? "https://3d-ultra.com/og-default.jpg" },
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

| Feature | Status | Location |
|---------|--------|----------|
| Share page route | ✅ Complete | share.$shareId.tsx |
| Share API endpoint | ✅ Complete | share.ts |
| Preview image display | ✅ Complete | share.$shareId.tsx |
| Mobile layout | ✅ Complete | share.$shareId.tsx |
| Error handling | ✅ Complete | share.$shareId.tsx |
| Gift CTA | ✅ Complete | share.$shareId.tsx |

### What Needs to Be Done

| Feature | Status | Notes |
|---------|--------|-------|
| OG meta tags | ❌ Pending | For rich link previews |
| Analytics tracking | ❌ Pending | share_page_viewed event |
| Updated messaging | ❌ Pending | Match AC-2 copy |

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
