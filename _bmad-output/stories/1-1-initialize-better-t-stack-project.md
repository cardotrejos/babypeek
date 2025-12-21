# Story 1.1: Initialize Better-T-Stack Project

**Epic:** 1 - Foundation & Observability  
**Status:** done  
**Created:** 2024-12-20  
**Priority:** High (Foundation - blocks all other work)

---

## User Story

As a **developer**,  
I want **the project initialized with Better-T-Stack, Hono, and Effect**,  
So that **I have a working monorepo ready for feature development**.

---

## Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Project has `apps/web` (TanStack Start) and `packages/api` (Hono) | ✅ Done |
| 2 | Effect is installed and configured | ✅ Done |
| 3 | `bun run dev` starts both frontend and backend | ✅ Done |
| 4 | TypeScript strict mode is enabled | ✅ Done |

---

## Current Implementation Status

### ✅ Already Complete

| Component | Location | Notes |
|-----------|----------|-------|
| TanStack Start frontend | `apps/web/` | React 19, TanStack Router, TanStack Query |
| Hono backend | `apps/server/` | Basic routes, CORS, logger middleware |
| Turborepo monorepo | Root `turbo.json` | Workspace scripts configured |
| Drizzle ORM package | `packages/db/` | Schema empty, migrations not run |
| API package | `packages/api/` | Health route exists |
| shadcn/ui ready | `apps/web/` | CVA, clsx, tailwind-merge installed |
| Dev scripts | `package.json` | `dev`, `dev:web`, `dev:server` work |

### ⚠️ Needs Completion

| Item | Current State | Required State |
|------|---------------|----------------|
| Effect integration | Installed at root only | Integrated into `packages/api` services |
| TypeScript strict | Unknown | `"strict": true` in all tsconfigs |
| Database schema | Empty (`export {}`) | Base tables defined |
| Effect services layer | Not exists | Service pattern for API endpoints |

---

## Implementation Tasks

### Task 1: Verify TypeScript Strict Mode
**Estimate:** 5 min

```bash
# Check all tsconfig files for strict mode
grep -r '"strict"' apps/*/tsconfig.json packages/*/tsconfig.json
```

If not enabled, add to each `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### Task 2: Set Up Effect in packages/api
**Estimate:** 30 min

The architecture specifies Effect for typed errors and service pattern.

**2.1 Add Effect dependencies to packages/api:**
```bash
cd packages/api
bun add effect @effect/schema
```

**2.2 Create Effect service layer structure:**

```
packages/api/src/
├── index.ts           # Exports routes
├── lib/
│   ├── env.ts         # Already exists
│   └── errors.ts      # Already exists - enhance with Effect
├── routes/
│   └── health.ts      # Already exists
└── services/
    └── index.ts       # Effect service definitions
```

**2.3 Create base Effect error types (`packages/api/src/lib/errors.ts`):**

```typescript
import { Data } from "effect"

// Typed errors using Effect's Data.TaggedError
export class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string
  field?: string
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  resource: string
  id: string
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  message: string
  cause?: unknown
}> {}

export class ExternalServiceError extends Data.TaggedError("ExternalServiceError")<{
  service: string
  message: string
  cause?: unknown
}> {}
```

**2.4 Create Effect runtime helper (`packages/api/src/lib/effect-runtime.ts`):**

```typescript
import { Effect, Layer, ManagedRuntime } from "effect"

// Base layer - will grow as we add services
export const AppLayer = Layer.empty

// Runtime for running effects in Hono handlers
export const runtime = ManagedRuntime.make(AppLayer)

// Helper to run Effect in Hono context
export const runEffect = <A, E>(
  effect: Effect.Effect<A, E, never>
): Promise<A> => runtime.runPromise(effect)
```

### Task 3: Create Base Database Schema
**Estimate:** 20 min

Per architecture doc, create the uploads table in `packages/db/src/schema/index.ts`:

```typescript
import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

export const uploads = pgTable("uploads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  email: text("email").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  originalUrl: text("original_url").notNull(),
  status: text("status", { 
    enum: ["pending", "processing", "completed", "failed"] 
  }).default("pending"),
  resultUrl: text("result_url"),
  previewUrl: text("preview_url"),
  workflowRunId: text("workflow_run_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
})

export const purchases = pgTable("purchases", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  uploadId: text("upload_id").notNull().references(() => uploads.id),
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: integer("amount").notNull(), // cents
  currency: text("currency").default("usd"),
  status: text("status", { 
    enum: ["pending", "completed", "failed", "refunded"] 
  }).default("pending"),
  isGift: boolean("is_gift").default(false),
  giftRecipientEmail: text("gift_recipient_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const downloads = pgTable("downloads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  purchaseId: text("purchase_id").notNull().references(() => purchases.id),
  downloadedAt: timestamp("downloaded_at").defaultNow().notNull(),
  ipHash: text("ip_hash"), // Hashed for privacy
})
```

**Install cuid2:**
```bash
cd packages/db
bun add @paralleldrive/cuid2
```

### Task 4: Verify Dev Server Startup
**Estimate:** 5 min

```bash
# From project root
bun run dev

# Verify both are running:
# - Web: http://localhost:3001
# - API: http://localhost:3000
```

---

## Definition of Done

- [ ] All tsconfig.json files have `"strict": true`
- [ ] Effect is integrated into `packages/api` with typed errors
- [ ] Base database schema defined (uploads, purchases, downloads)
- [ ] `bun run dev` starts both web and server without errors
- [ ] Health endpoint returns 200 at `http://localhost:3000/api/health`
- [ ] No TypeScript errors in any package

---

## Technical Notes

### Architecture References

From `_bmad-output/architecture.md`:

- **Effect Pattern:** All business logic uses Effect services with typed errors
- **Error Types:** Use `Data.TaggedError` for typed error handling
- **Database:** Neon PostgreSQL with Drizzle ORM
- **Session Tokens:** Used for result access (no user auth)

### Dependencies Already Installed

```json
// Root package.json
"effect": "^3.19.13",
"@effect/schema": "^0.75.5"
```

### File Paths

| File | Purpose |
|------|---------|
| `packages/api/src/lib/errors.ts` | Effect typed errors |
| `packages/api/src/lib/effect-runtime.ts` | Effect runtime helper |
| `packages/api/src/services/index.ts` | Service definitions |
| `packages/db/src/schema/index.ts` | Database tables |

---

## Related Stories

- **Story 1.2:** Configure Neon PostgreSQL Connection (depends on schema from this story)
- **Story 1.3:** Configure Cloudflare R2 Storage
- **Story 1.4:** Set Up Environment Configuration
