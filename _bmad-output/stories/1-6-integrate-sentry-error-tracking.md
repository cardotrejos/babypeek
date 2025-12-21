# Story 1.6: Integrate Sentry Error Tracking

**Epic:** 1 - Foundation & Observability  
**Status:** ready-for-dev  
**Created:** 2024-12-20  
**Priority:** Medium (Observability - alerts on production errors)

---

## User Story

As a **developer**,  
I want **Sentry integrated for error tracking**,  
So that **I'm alerted to production errors immediately**.

---

## Acceptance Criteria

| # | Criterion | Test |
|---|-----------|------|
| AC1 | Sentry DSN validated in environment | App warns (dev) or fails (prod) if SENTRY_DSN missing |
| AC2 | Unhandled errors reported to Sentry with stack trace | Throw error → appears in Sentry dashboard |
| AC3 | Source maps uploaded for readable traces | Stack traces show original TypeScript code |
| AC4 | User context (session token, not PII) attached | Errors include session token for correlation |
| AC5 | Breadcrumbs show recent actions | Error includes last 5 user actions |

---

## Tasks / Subtasks

- [ ] **Task 1: Set Up Sentry on Frontend** (AC: 1, 2, 4, 5)
  - [ ] 1.1 Install `@sentry/react` in `apps/web`
  - [ ] 1.2 Initialize Sentry with DSN from environment
  - [ ] 1.3 Configure error boundary for React
  - [ ] 1.4 Set up session token as user context
  - [ ] 1.5 Enable breadcrumb tracking

- [ ] **Task 2: Set Up Sentry on Backend** (AC: 1, 2, 4)
  - [ ] 2.1 Install `@sentry/node` in `packages/api`
  - [ ] 2.2 Create Sentry initialization for Hono
  - [ ] 2.3 Create error handling middleware
  - [ ] 2.4 Attach session token to error context

- [ ] **Task 3: Configure Source Maps** (AC: 3)
  - [ ] 3.1 Install `@sentry/vite-plugin` for frontend
  - [ ] 3.2 Configure Vite to upload source maps
  - [ ] 3.3 Configure backend build to generate source maps
  - [ ] 3.4 Verify source maps appear in Sentry

- [ ] **Task 4: Create Error Helpers** (AC: 2, 4, 5)
  - [ ] 4.1 Create `captureException` helper with context
  - [ ] 4.2 Create `addBreadcrumb` helper for actions
  - [ ] 4.3 Integrate with Effect error handling
  - [ ] 4.4 Ensure PII is never sent to Sentry

- [ ] **Task 5: Verify Integration** (AC: 1-5)
  - [ ] 5.1 Trigger frontend error → verify in Sentry
  - [ ] 5.2 Trigger backend error → verify in Sentry
  - [ ] 5.3 Verify source maps show TypeScript code
  - [ ] 5.4 Verify session token appears in error context
  - [ ] 5.5 Verify breadcrumbs show recent actions

---

## Dev Notes

### Architecture Requirements

**From `architecture.md`:**

- Sentry for error tracking
- Log real errors to Sentry
- Show warm, vague copy to users
- Never expose: job IDs, token values, rate limit timing
- No PII in logs

### Sentry Frontend Setup

**Initialization (`apps/web/src/lib/sentry.ts`):**

```typescript
import * as Sentry from "@sentry/react"

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) {
    console.warn("Sentry DSN not configured")
    return
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // Privacy
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0, // 100% on errors
    
    // Filter out PII
    beforeSend(event) {
      // Remove email from user context
      if (event.user?.email) {
        delete event.user.email
      }
      return event
    },
  })
}

export function setSessionContext(sessionToken: string) {
  Sentry.setUser({ id: sessionToken })
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: "info",
  })
}
```

**Error Boundary (`apps/web/src/components/error-boundary.tsx`):**

```typescript
import * as Sentry from "@sentry/react"

export const ErrorBoundary = Sentry.withErrorBoundary(
  ({ children }) => children,
  {
    fallback: ({ error }) => (
      <div className="error-page">
        <h1>Something went wrong</h1>
        <p>We've been notified and are working on it!</p>
      </div>
    ),
  }
)
```

### Sentry Backend Setup

**Hono Middleware (`packages/api/src/middleware/sentry.ts`):**

```typescript
import * as Sentry from "@sentry/node"
import { createMiddleware } from "hono/factory"
import { env } from "../lib/env"

export function initSentryBackend() {
  if (!env.SENTRY_DSN) {
    console.warn("Sentry DSN not configured for backend")
    return
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.1,
  })
}

export const sentryMiddleware = createMiddleware(async (c, next) => {
  const sessionToken = c.req.header("X-Session-Token")
  
  if (sessionToken) {
    Sentry.setUser({ id: sessionToken })
  }

  try {
    await next()
  } catch (error) {
    Sentry.captureException(error)
    throw error
  }
})
```

### Source Maps Configuration

**Vite Plugin (`apps/web/vite.config.ts`):**

```typescript
import { sentryVitePlugin } from "@sentry/vite-plugin"

export default defineConfig({
  build: {
    sourcemap: true, // Required for Sentry
  },
  plugins: [
    // ... other plugins
    sentryVitePlugin({
      org: "your-org",
      project: "3d-ultra-web",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
})
```

### Effect Integration

**Error Handler (`packages/api/src/lib/sentry-effect.ts`):**

```typescript
import * as Sentry from "@sentry/node"
import { Effect } from "effect"
import type { AppError } from "./errors"

export const captureEffectError = (error: AppError, context?: Record<string, unknown>) =>
  Effect.sync(() => {
    Sentry.captureException(error, {
      tags: { error_type: error._tag },
      extra: context,
    })
  })
```

### Environment Variables

```bash
# Frontend (apps/web/.env)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Backend (apps/server/.env)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# CI/CD (for source map uploads)
SENTRY_AUTH_TOKEN=sntrys_xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=3d-ultra
```

### Previous Story Learnings

**From Story 1.1:**
- Effect error types defined in `packages/api/src/lib/errors.ts`

**From Story 1.4:**
- Environment validation with Zod
- SENTRY_DSN already in env schema as optional

### File Locations

| File | Purpose |
|------|---------|
| `apps/web/src/lib/sentry.ts` | NEW: Frontend Sentry init |
| `apps/web/src/components/error-boundary.tsx` | NEW: React error boundary |
| `packages/api/src/middleware/sentry.ts` | NEW: Backend middleware |
| `packages/api/src/lib/sentry-effect.ts` | NEW: Effect integration |
| `apps/web/vite.config.ts` | UPDATE: Add source maps plugin |

### Dependencies

```bash
# Frontend
cd apps/web
bun add @sentry/react @sentry/vite-plugin

# Backend
cd packages/api
bun add @sentry/node
```

---

## Dev Agent Record

### Agent Model Used

(To be filled during implementation)

### Debug Log References

N/A

### Completion Notes List

(To be filled during implementation)

### File List

| File | Action |
|------|--------|
| `apps/web/src/lib/sentry.ts` | Created |
| `apps/web/src/components/error-boundary.tsx` | Created |
| `packages/api/src/middleware/sentry.ts` | Created |
| `packages/api/src/lib/sentry-effect.ts` | Created |
| `apps/web/vite.config.ts` | Modified |
| `apps/server/.env.example` | Modified |
| `apps/web/.env.example` | Modified |

---

## Change Log

| Date | Change |
|------|--------|
| 2024-12-20 | Story created with comprehensive context |

---

## References

- [Source: architecture.md#Cross-Cutting-Concerns] - Sentry error tracking
- [Source: architecture.md#Error-Handling] - Log to Sentry, show warm copy
- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Node Docs](https://docs.sentry.io/platforms/node/)
