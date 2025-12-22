# Story 8.7: Auto-Delete After 30 Days

Status: ready-for-dev

## Story

As a **system operator**,
I want **images automatically deleted after 30 days**,
so that **storage costs are controlled and privacy is maintained**.

## Acceptance Criteria

1. **AC-1:** Given an upload is older than 30 days (FR-8.5), when the cleanup job runs (daily cron), then original and result images are deleted from R2
2. **AC-2:** Database records are anonymized (email hashed) or deleted
3. **AC-3:** The deletion is logged
4. **AC-4:** Purchased images follow same policy (30 days post-purchase)
5. **AC-5:** Job runs reliably once per day
6. **AC-6:** Job handles partial failures gracefully

## Tasks / Subtasks

- [ ] **Task 1: Create cleanup service** (AC: 1, 2, 3)
  - [ ] Create `packages/api/src/services/CleanupService.ts`
  - [ ] Implement Effect service for data cleanup
  - [ ] Query uploads older than 30 days
  - [ ] Delete R2 objects
  - [ ] Anonymize/delete database records

- [ ] **Task 2: Create cleanup API endpoint** (AC: 5)
  - [ ] Create `packages/api/src/routes/cleanup.ts`
  - [ ] Implement `POST /api/cron/cleanup` endpoint
  - [ ] Secure with CRON_SECRET header
  - [ ] Return cleanup statistics

- [ ] **Task 3: Configure Vercel Cron** (AC: 5)
  - [ ] Add `vercel.json` cron configuration
  - [ ] Schedule for daily at 3 AM UTC
  - [ ] Add CRON_SECRET environment variable

- [ ] **Task 4: Handle purchased uploads** (AC: 4)
  - [ ] Check for purchases associated with upload
  - [ ] Use purchase date + 30 days for purchased items
  - [ ] Only delete if 30 days past purchase

- [ ] **Task 5: Add error handling** (AC: 6)
  - [ ] Continue processing on individual failures
  - [ ] Log all failures to Sentry
  - [ ] Report partial success in response

- [ ] **Task 6: Write tests**
  - [ ] Unit test: Identifies stale records
  - [ ] Unit test: Respects purchase dates
  - [ ] Unit test: Handles partial failures
  - [ ] Integration test: Full cleanup flow

## Dev Notes

### Architecture Compliance

- **Service Pattern:** Effect service with typed errors
- **Cron Pattern:** Vercel cron with secret verification
- **Error Handling:** Graceful partial failure handling

### CleanupService Implementation

```typescript
// packages/api/src/services/CleanupService.ts
import { Effect, Context, Layer, pipe, Array } from "effect"
import { eq, lt, and, isNull, or } from "drizzle-orm"
import { db, uploads, results, purchases } from "@3d-ultra/db"
import { R2Service } from "./R2Service"

export class CleanupError extends Data.TaggedError("CleanupError")<{
  cause: "DB_ERROR" | "R2_ERROR"
  message: string
}> {}

export class CleanupService extends Context.Tag("CleanupService")<
  CleanupService,
  {
    cleanupStaleUploads: () => Effect.Effect<CleanupResult, CleanupError>
  }
>() {}

interface CleanupResult {
  processed: number
  deleted: number
  failed: number
  errors: string[]
}

export const CleanupServiceLive = Layer.effect(
  CleanupService,
  Effect.gen(function* () {
    const r2Service = yield* R2Service

    return {
      cleanupStaleUploads: () =>
        Effect.gen(function* () {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          
          // Find uploads older than 30 days
          // For purchased uploads, use purchase date instead
          const staleUploads = yield* Effect.promise(() =>
            db.query.uploads.findMany({
              where: lt(uploads.createdAt, thirtyDaysAgo),
            })
          )

          // Filter out recently purchased uploads
          const uploadsToDelete: typeof staleUploads = []
          
          for (const upload of staleUploads) {
            // Check if purchased
            const purchase = yield* Effect.promise(() =>
              db.query.purchases.findFirst({
                where: eq(purchases.uploadId, upload.id),
                orderBy: (p, { desc }) => [desc(p.createdAt)],
              })
            )

            if (purchase) {
              // Keep for 30 days after purchase
              const purchaseExpiry = new Date(
                purchase.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000
              )
              if (purchaseExpiry > new Date()) {
                continue // Skip - still within purchase retention
              }
            }

            uploadsToDelete.push(upload)
          }

          let deleted = 0
          let failed = 0
          const errors: string[] = []

          for (const upload of uploadsToDelete) {
            const deleteResult = yield* deleteUpload(upload, r2Service).pipe(
              Effect.match({
                onSuccess: () => ({ success: true }),
                onFailure: (error) => ({ success: false, error: String(error) }),
              })
            )

            if (deleteResult.success) {
              deleted++
            } else {
              failed++
              errors.push(`Upload ${upload.id}: ${deleteResult.error}`)
            }
          }

          // Log summary
          console.log(
            `[Cleanup] Processed: ${uploadsToDelete.length}, ` +
            `Deleted: ${deleted}, Failed: ${failed}`
          )

          return {
            processed: uploadsToDelete.length,
            deleted,
            failed,
            errors,
          }
        }),
    }
  })
)

function deleteUpload(upload: Upload, r2Service: R2Service) {
  return Effect.gen(function* () {
    // 1. Delete R2 objects
    const r2Keys = [
      `uploads/${upload.id}/original.jpg`,
      `results/${upload.id}/full.jpg`,
      `results/${upload.id}/preview.jpg`,
    ]

    for (const key of r2Keys) {
      yield* r2Service.deleteObject(key).pipe(
        Effect.catchAll(() => Effect.succeed(undefined))
      )
    }

    // 2. Anonymize purchase records
    yield* Effect.promise(() =>
      db.update(purchases)
        .set({ email: "deleted@gdpr.local" })
        .where(eq(purchases.uploadId, upload.id))
    )

    // 3. Delete result records
    yield* Effect.promise(() =>
      db.delete(results).where(eq(results.uploadId, upload.id))
    )

    // 4. Delete upload record
    yield* Effect.promise(() =>
      db.delete(uploads).where(eq(uploads.id, upload.id))
    )

    console.log(`[Cleanup] Deleted upload: ${upload.id}`)
  })
}
```

### Cleanup API Endpoint

```typescript
// packages/api/src/routes/cleanup.ts
import { Hono } from "hono"
import { Effect } from "effect"
import { CleanupService, CleanupServiceLive } from "../services/CleanupService"
import { R2ServiceLive } from "../services/R2Service"
import { env } from "../lib/env"

const app = new Hono()

/**
 * POST /api/cron/cleanup
 * Daily cleanup cron job
 * 
 * Story 8.7: Auto-Delete After 30 Days
 * 
 * Secured with CRON_SECRET header to prevent unauthorized access.
 */
app.post("/cleanup", async (c) => {
  // Verify cron secret
  const cronSecret = c.req.header("x-cron-secret")
  
  if (!cronSecret || cronSecret !== env.CRON_SECRET) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const program = Effect.gen(function* () {
    const cleanupService = yield* CleanupService
    return yield* cleanupService.cleanupStaleUploads()
  })

  try {
    const result = await Effect.runPromise(
      program.pipe(
        Effect.provide(CleanupServiceLive),
        Effect.provide(R2ServiceLive)
      )
    )

    return c.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("[Cleanup] Cron job failed:", error)
    return c.json({
      success: false,
      error: String(error),
    }, 500)
  }
})

export default app
```

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Schedule:** Daily at 3 AM UTC (off-peak hours)

### Environment Variable

Add to `.env.example` and Vercel:
```bash
CRON_SECRET=your-secure-random-string
```

### Add Route to Server

```typescript
// packages/api/src/index.ts
import cleanupRoutes from "./routes/cleanup"

// Mount under /api/cron for cron-specific endpoints
app.route("/api/cron", cleanupRoutes)
```

### File Structure

```
packages/api/src/services/
├── CleanupService.ts    <- NEW: Cleanup logic

packages/api/src/routes/
├── cleanup.ts           <- NEW: Cron endpoint
├── cleanup.test.ts      <- NEW: Tests

vercel.json              <- UPDATE: Add cron config
```

### Monitoring & Alerts

Consider adding alerts for:
- Job failures (via Sentry)
- Unusually high deletion counts
- R2 errors during cleanup

```typescript
// In cleanup endpoint
if (result.failed > 0) {
  Sentry.captureMessage("Cleanup job had failures", {
    level: "warning",
    extra: {
      processed: result.processed,
      deleted: result.deleted,
      failed: result.failed,
      errors: result.errors,
    },
  })
}
```

### Retention Policy Summary

| Record Type | Retention |
|------------|-----------|
| Unpurchased uploads | 30 days from upload |
| Purchased uploads | 30 days from purchase |
| R2 images | Same as upload record |
| Purchase records | Anonymized (email → "deleted@gdpr.local") |

### Dependencies

- **Story 8.6 (Delete Button):** Shares deletion logic
- **R2Service:** Must have `deleteObject` method

### Parallel Work

Can be developed in parallel with:
- Story 8.6 (Delete Button)
- Story 8.8 (Expired Handling)

### References

- [Source: _bmad-output/epics.md#Story 8.7] - Auto-delete requirements
- [Source: _bmad-output/prd.md#FR-8.5] - 30-day auto-deletion
- [Source: _bmad-output/architecture.md#GDPR Compliance] - Data retention policy

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
