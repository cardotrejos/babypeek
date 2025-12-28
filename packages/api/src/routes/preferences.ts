import { Hono } from "hono"
import { Effect } from "effect"
import { eq, and } from "drizzle-orm"

import { db, uploads, results, preferences, preferenceReasonValues, type PreferenceReason } from "@babypeek/db"

const app = new Hono()

// =============================================================================
// POST /api/preferences
// =============================================================================

/**
 * POST /api/preferences
 * 
 * Save user preference for a result variant.
 * This data is used to improve prompt quality over time.
 * 
 * Headers:
 * - X-Session-Token: string - Session token for authorization
 * 
 * Body:
 * {
 *   uploadId: string,
 *   selectedResultId: string,
 *   reason?: "more_realistic" | "better_lighting" | "cuter_expression" | "clearer_details" | "better_colors" | "more_natural" | "other"
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   preferenceId: "clx123..."
 * }
 * 
 * Error responses:
 * - 400: Invalid request body
 * - 401: Invalid or missing session token
 * - 404: Upload or result not found
 */
app.post("/", async (c) => {
  const sessionToken = c.req.header("X-Session-Token")

  // Require session token
  if (!sessionToken) {
    return c.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Session token required" } },
      401
    )
  }

  // Parse and validate body
  let body: { uploadId?: string; selectedResultId?: string; reason?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json(
      { success: false, error: { code: "INVALID_BODY", message: "Invalid JSON body" } },
      400
    )
  }

  const { uploadId, selectedResultId, reason } = body

  if (!uploadId || typeof uploadId !== "string") {
    return c.json(
      { success: false, error: { code: "INVALID_BODY", message: "uploadId is required" } },
      400
    )
  }

  if (!selectedResultId || typeof selectedResultId !== "string") {
    return c.json(
      { success: false, error: { code: "INVALID_BODY", message: "selectedResultId is required" } },
      400
    )
  }

  // Validate reason if provided
  if (reason && !preferenceReasonValues.includes(reason as PreferenceReason)) {
    return c.json(
      { success: false, error: { code: "INVALID_BODY", message: `Invalid reason. Must be one of: ${preferenceReasonValues.join(", ")}` } },
      400
    )
  }

  const savePreference = Effect.gen(function* () {
    // Verify upload exists and session token matches
    const upload = yield* Effect.promise(() =>
      db.query.uploads.findFirst({
        where: and(eq(uploads.id, uploadId), eq(uploads.sessionToken, sessionToken)),
      })
    )

    if (!upload) {
      return { error: "NOT_FOUND", message: "Upload not found or unauthorized" } as const
    }

    // Verify the selected result exists and belongs to this upload
    const selectedResult = yield* Effect.promise(() =>
      db.query.results.findFirst({
        where: and(eq(results.id, selectedResultId), eq(results.uploadId, uploadId)),
      })
    )

    if (!selectedResult) {
      return { error: "NOT_FOUND", message: "Result not found" } as const
    }

    // Get all result variants for this upload (to store what was shown)
    const allResults = yield* Effect.promise(() =>
      db.query.results.findMany({
        where: eq(results.uploadId, uploadId),
        orderBy: (results, { asc }) => [asc(results.variantIndex)],
      })
    )

    const shownVariants = allResults.map((r) => r.promptVersion)

    // Check if preference already exists for this upload
    const existingPreference = yield* Effect.promise(() =>
      db.query.preferences.findFirst({
        where: eq(preferences.uploadId, uploadId),
      })
    )

    if (existingPreference) {
      // Update existing preference
      yield* Effect.promise(() =>
        db
          .update(preferences)
          .set({
            selectedResultId,
            selectedPromptVersion: selectedResult.promptVersion,
            reason: (reason as PreferenceReason) ?? null,
            shownVariants: JSON.stringify(shownVariants),
          })
          .where(eq(preferences.id, existingPreference.id))
      )

      return { success: true, preferenceId: existingPreference.id, updated: true } as const
    }

    // Insert new preference
    const [newPreference] = yield* Effect.promise(() =>
      db
        .insert(preferences)
        .values({
          uploadId,
          selectedResultId,
          selectedPromptVersion: selectedResult.promptVersion,
          reason: (reason as PreferenceReason) ?? null,
          shownVariants: JSON.stringify(shownVariants),
        })
        .returning({ id: preferences.id })
    )

    return { success: true, preferenceId: newPreference?.id, updated: false } as const
  })

  const result = await Effect.runPromise(Effect.either(savePreference))

  if (result._tag === "Left") {
    console.error("[preferences] Unexpected error:", result.left)
    return c.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      500
    )
  }

  const data = result.right

  if ("error" in data) {
    const status = data.error === "NOT_FOUND" ? 404 : 500
    return c.json(
      { success: false, error: { code: data.error, message: data.message } },
      status
    )
  }

  return c.json({
    success: true,
    preferenceId: data.preferenceId,
    updated: data.updated,
  })
})

// =============================================================================
// GET /api/preferences/stats
// =============================================================================

/**
 * GET /api/preferences/stats
 * 
 * Get aggregated preference statistics for prompt optimization.
 * This endpoint is for internal analytics (no auth required for now).
 * 
 * Response:
 * {
 *   success: true,
 *   stats: {
 *     totalPreferences: 150,
 *     byPromptVersion: {
 *       "v3": { selected: 20, shown: 150, winRate: 0.133 },
 *       "v3-json": { selected: 30, shown: 150, winRate: 0.200 },
 *       "v4": { selected: 60, shown: 150, winRate: 0.400 },
 *       "v4-json": { selected: 40, shown: 150, winRate: 0.267 }
 *     },
 *     byReason: {
 *       "more_realistic": 45,
 *       "better_lighting": 30,
 *       ...
 *     }
 *   }
 * }
 */
app.get("/stats", async (c) => {
  const getStats = Effect.gen(function* () {
    // Get all preferences
    const allPreferences = yield* Effect.promise(() =>
      db.query.preferences.findMany()
    )

    const totalPreferences = allPreferences.length

    // Aggregate by prompt version
    const byPromptVersion: Record<string, { selected: number; shown: number; winRate: number }> = {}
    
    for (const pref of allPreferences) {
      // Count as selected
      const version = pref.selectedPromptVersion
      if (!byPromptVersion[version]) {
        byPromptVersion[version] = { selected: 0, shown: 0, winRate: 0 }
      }
      byPromptVersion[version].selected++

      // Count all shown variants
      try {
        const shown = JSON.parse(pref.shownVariants) as string[]
        for (const v of shown) {
          if (!byPromptVersion[v]) {
            byPromptVersion[v] = { selected: 0, shown: 0, winRate: 0 }
          }
          byPromptVersion[v].shown++
        }
      } catch {
        // Skip malformed data
      }
    }

    // Calculate win rates
    for (const version of Object.keys(byPromptVersion)) {
      const data = byPromptVersion[version]
      if (data && data.shown > 0) {
        data.winRate = Math.round((data.selected / data.shown) * 1000) / 1000
      }
    }

    // Aggregate by reason
    const byReason: Record<string, number> = {}
    for (const pref of allPreferences) {
      if (pref.reason) {
        byReason[pref.reason] = (byReason[pref.reason] ?? 0) + 1
      }
    }

    return {
      totalPreferences,
      byPromptVersion,
      byReason,
    }
  })

  const result = await Effect.runPromise(Effect.either(getStats))

  if (result._tag === "Left") {
    console.error("[preferences/stats] Unexpected error:", result.left)
    return c.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
      500
    )
  }

  return c.json({
    success: true,
    stats: result.right,
  })
})

export default app
