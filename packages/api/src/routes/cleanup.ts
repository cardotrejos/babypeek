import { Hono } from "hono"
import { Effect } from "effect"
import { CleanupService, CleanupServiceLive } from "../services/CleanupService"
import { R2ServiceLive } from "../services/R2Service"
import { env } from "../lib/env"
import { captureException, addBreadcrumb } from "../middleware/sentry"

const app = new Hono()

/**
 * POST /api/cron/cleanup
 * Cleanup stale uploads and R2 objects
 * 
 * Story 8.7: Auto-Delete After 30 Days
 * 
 * Requires CRON_SECRET header for authentication.
 * Called daily at 3 AM UTC via Vercel Cron.
 * 
 * Retention Policy:
 * - Unpurchased uploads: 30 days from upload.createdAt
 * - Purchased uploads: 30 days from purchase.createdAt
 * - R2 images: Deleted with upload record
 * - Purchase records: Anonymized (email -> "deleted@gdpr.local") then deleted
 * - Download records: Deleted with purchase
 */
app.post("/", async (c) => {
  // Verify CRON_SECRET header (supports both x-cron-secret and Authorization: Bearer)
  const cronSecret = c.req.header("x-cron-secret") || 
                     c.req.header("authorization")?.replace("Bearer ", "")

  if (!env.CRON_SECRET) {
    addBreadcrumb("Cleanup skipped - CRON_SECRET not configured", "cron")
    return c.json({
      success: false,
      error: { code: "CONFIG_MISSING", message: "CRON_SECRET not configured" }
    }, 500)
  }

  if (cronSecret !== env.CRON_SECRET) {
    addBreadcrumb("Cleanup unauthorized - invalid CRON_SECRET", "cron")
    return c.json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid cron secret" }
    }, 401)
  }

  addBreadcrumb("Cleanup started", "cron")

  const program = Effect.gen(function* () {
    const cleanupService = yield* CleanupService
    return yield* cleanupService.runCleanup
  })

  const startTime = Date.now()
  const resultEither = await Effect.runPromise(
    Effect.either(
      program.pipe(
        Effect.provide(CleanupServiceLive),
        Effect.provide(R2ServiceLive)
      )
    )
  )

  const durationMs = Date.now() - startTime

  if (resultEither._tag === "Left") {
    const error = resultEither.left
    captureException(
      error instanceof Error ? error : new Error(String(error)),
      { context: "cleanup_cron" }
    )
    addBreadcrumb("Cleanup failed", "cron", { error: String(error) })
    
    return c.json({
      success: false,
      error: { 
        code: "CLEANUP_FAILED", 
        message: error instanceof Error ? error.message : "Cleanup failed"
      },
      durationMs,
    }, 500)
  }

  const result = resultEither.right

  // Log errors to Sentry if any partial failures occurred
  if (result.errors.length > 0) {
    captureException(
      new Error(`Cleanup partial failure: ${result.errors.length} errors`),
      { 
        context: "cleanup_cron",
        errors: result.errors,
        stats: {
          processed: result.processed,
          deleted: result.deleted,
          failed: result.failed,
        }
      }
    )
  }

  addBreadcrumb("Cleanup completed", "cron", {
    processed: result.processed,
    deleted: result.deleted,
    failed: result.failed,
  })

  return c.json({
    success: true,
    stats: {
      processed: result.processed,
      deleted: result.deleted,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    },
    durationMs,
  })
})

export default app
