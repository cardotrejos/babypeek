import { Effect } from "effect"
import * as Sentry from "@sentry/node"
import { isSentryConfigured, env } from "./env"
import type { AppError } from "./errors"

/**
 * Capture an Effect error to Sentry
 * Use this in Effect.tapError or Effect.catchAll
 */
export const captureEffectError = <E extends AppError>(
  error: E,
  context?: Record<string, unknown>
): Effect.Effect<void> =>
  Effect.sync(() => {
    if (isSentryConfigured()) {
      Sentry.captureException(error, {
        tags: {
          error_type: error._tag,
        },
        extra: {
          ...context,
          error_details: error,
        },
      })
    } else if (env.NODE_ENV === "development") {
      console.error(`🛡️ [Sentry Mock] ${error._tag}:`, error, context)
    }
  })

/**
 * Add a breadcrumb in Effect context
 */
export const addEffectBreadcrumb = (
  message: string,
  category: string = "effect",
  data?: Record<string, unknown>
): Effect.Effect<void> =>
  Effect.sync(() => {
    if (isSentryConfigured()) {
      Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: "info",
      })
    }
  })

/**
 * Wrap an Effect to capture errors to Sentry
 * The error is captured but still fails the Effect
 */
export const withSentryCapture = <A, E extends AppError, R>(
  effect: Effect.Effect<A, E, R>,
  context?: Record<string, unknown>
): Effect.Effect<A, E, R> =>
  Effect.tapError(effect, (error) => captureEffectError(error, context))
