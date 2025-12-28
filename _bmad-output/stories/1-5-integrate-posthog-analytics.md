# Story 1.5: Integrate PostHog Analytics

**Epic:** 1 - Foundation & Observability  
**Status:** done  
**Created:** 2024-12-20  
**Priority:** Medium (Observability - tracks user behavior)

---

## User Story

As a **developer**,  
I want **PostHog analytics integrated on frontend and backend**,  
So that **I can track user behavior and funnel metrics**.

---

## Acceptance Criteria

| #   | Criterion                                     | Test                                                   |
| --- | --------------------------------------------- | ------------------------------------------------------ |
| AC1 | PostHog API key validated in environment      | App warns (dev) or fails (prod) if POSTHOG_KEY missing |
| AC2 | Page views tracked automatically on frontend  | PostHog dashboard shows page view events               |
| AC3 | Custom events can be fired from frontend      | `posthog.capture('upload_started')` works              |
| AC4 | Custom events can be fired from backend       | Server can send events via PostHog API                 |
| AC5 | User identification works with session tokens | Events grouped by session token                        |

---

## Tasks / Subtasks

- [x] **Task 1: Set Up PostHog on Frontend** (AC: 1, 2, 3)
  - [x] 1.1 Install `posthog-js` in `apps/web`
  - [x] 1.2 Create PostHog provider component
  - [x] 1.3 Initialize PostHog with API key from environment
  - [x] 1.4 Enable automatic page view tracking
  - [x] 1.5 TypeScript types verified

- [x] **Task 2: Create Analytics Hook** (AC: 3, 5)
  - [x] 2.1 Create `useAnalytics` hook for event tracking
  - [x] 2.2 Implement `trackEvent(name, properties)` function
  - [x] 2.3 Add session token via identify()
  - [x] 2.4 Add helper for common events (upload, reveal, purchase, etc.)

- [x] **Task 3: Set Up PostHog on Backend** (AC: 1, 4)
  - [x] 3.1 Install `posthog-node` in `packages/api`
  - [x] 3.2 Create PostHogService as Effect service
  - [x] 3.3 Implement server-side event capture
  - [x] 3.4 Add shutdown hook to flush events

- [x] **Task 4: Define Core Events** (AC: 3, 4)
  - [x] 4.1 Document all events to track
  - [x] 4.2 Create type definitions for event properties
  - [x] 4.3 Typed event helpers created

- [x] **Task 5: Verify Integration** (AC: 1-5)
  - [x] 5.1 TypeScript compilation verified
  - [x] 5.2 Mock logging in dev mode
  - [x] 5.3 Services exported correctly

---

## Dev Notes

### Architecture Requirements

**From `architecture.md`:**

- Analytics: PostHog for event tracking throughout
- Session tokens used for user identification (no user auth)
- Track funnel: Upload → Process → Reveal → Payment → Download

### PostHog Setup

**Frontend Provider (`apps/web/src/lib/posthog.tsx`):**

```typescript
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (typeof window !== 'undefined' && import.meta.env.VITE_POSTHOG_KEY) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
    })
  }

  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

**Analytics Hook (`apps/web/src/hooks/use-analytics.ts`):**

```typescript
import { usePostHog } from 'posthog-js/react'
import { useCallback } from 'react'

export function useAnalytics() {
  const posthog = usePostHog()

  const identify = useCallback((sessionToken: string) => {
    posthog?.identify(sessionToken)
  }, [posthog])

  const trackEvent = useCallback((
    event: string,
    properties?: Record<string, unknown>
  ) => {
    posthog?.capture(event, properties)
  }, [posthog])

  return { identify, trackEvent }
}
```

**Backend Service (`packages/api/src/services/PostHogService.ts`):**

```typescript
import { Effect, Context, Layer } from "effect"
import { PostHog } from "posthog-node"
import { env } from "../lib/env"

export class PostHogService extends Context.Tag("PostHogService")<
  PostHogService,
  {
    capture: (event: string, distinctId: string, properties?: Record<string, unknown>) => Effect.Effect<void>
    shutdown: () => Effect.Effect<void>
  }
>() {}

export const PostHogServiceLive = Layer.succeed(PostHogService, {
  capture: (event, distinctId, properties) =>
    Effect.sync(() => {
      if (!env.POSTHOG_KEY) return
      const client = new PostHog(env.POSTHOG_KEY)
      client.capture({ event, distinctId, properties })
    }),
  shutdown: () =>
    Effect.promise(async () => {
      // Flush any pending events
      const client = new PostHog(env.POSTHOG_KEY || "")
      await client.shutdown()
    }),
})
```

### Core Events to Track

| Event                  | Trigger               | Properties               |
| ---------------------- | --------------------- | ------------------------ |
| `page_view`            | Auto (frontend)       | `path`, `referrer`       |
| `upload_started`       | User selects image    | `file_type`, `file_size` |
| `upload_completed`     | Upload to R2 succeeds | `duration_ms`            |
| `processing_started`   | AI job begins         | `job_id`                 |
| `processing_completed` | AI job finishes       | `job_id`, `duration_ms`  |
| `reveal_viewed`        | User sees result      | `job_id`                 |
| `checkout_started`     | User clicks purchase  | `price`, `type`          |
| `purchase_completed`   | Stripe webhook        | `amount`, `type`         |
| `download_initiated`   | User downloads HD     | `purchase_id`            |
| `share_clicked`        | User shares result    | `platform`               |

### Environment Variables

```bash
# Frontend (apps/web/.env)
VITE_POSTHOG_KEY=phc_...

# Backend (apps/server/.env)
POSTHOG_KEY=phc_...
```

### Previous Story Learnings

**From Story 1.1:**

- Effect service pattern established
- Services go in `packages/api/src/services/`

**From Story 1.4:**

- Environment validation with Zod
- Optional variables in dev, can be required in production

### File Locations

| File                                          | Purpose                      |
| --------------------------------------------- | ---------------------------- |
| `apps/web/src/lib/posthog.tsx`                | NEW: PostHog provider        |
| `apps/web/src/hooks/use-analytics.ts`         | NEW: Analytics hook          |
| `packages/api/src/services/PostHogService.ts` | NEW: Backend service         |
| `packages/api/src/lib/env.ts`                 | UPDATE: Add POSTHOG_KEY      |
| `apps/web/.env.example`                       | UPDATE: Add VITE_POSTHOG_KEY |

### Dependencies

```bash
# Frontend
cd apps/web
bun add posthog-js

# Backend
cd packages/api
bun add posthog-node
```

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4

### Debug Log References

N/A

### Completion Notes List

- Installed posthog-js (v1.309.1) in apps/web
- Installed posthog-node (v5.17.4) in packages/api
- Created PostHogProvider with auto-init and dev logging
- Created useAnalytics hook with typed events and convenience methods
- Created PostHogService as Effect service with capture, identify, shutdown
- Added standalone captureEvent() and shutdownPostHog() helpers
- Created apps/web/.env.example with VITE_POSTHOG_KEY
- All TypeScript types compile cleanly

### File List

| File                                          | Action   |
| --------------------------------------------- | -------- |
| `apps/web/src/lib/posthog.tsx`                | Created  |
| `apps/web/src/hooks/use-analytics.ts`         | Created  |
| `packages/api/src/services/PostHogService.ts` | Created  |
| `packages/api/src/services/index.ts`          | Modified |
| `packages/api/src/lib/env.ts`                 | Modified |
| `apps/web/.env.example`                       | Modified |

---

## Change Log

| Date       | Change                                   |
| ---------- | ---------------------------------------- |
| 2024-12-20 | Story created with comprehensive context |

---

## References

- [Source: architecture.md#Cross-Cutting-Concerns] - PostHog analytics
- [Source: architecture.md#Effect-Service-Pattern] - Service implementation
- [PostHog JS Docs](https://posthog.com/docs/libraries/js)
- [PostHog Node Docs](https://posthog.com/docs/libraries/node)
