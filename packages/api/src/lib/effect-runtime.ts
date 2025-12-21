import { Effect, Layer, ManagedRuntime } from "effect"
import type { Context } from "hono"
import type { AppError } from "./errors"

// Base layer - will grow as we add services (R2, Stripe, Resend, etc.)
export const AppLayer = Layer.empty

// Runtime for running effects in Hono handlers
export const runtime = ManagedRuntime.make(AppLayer)

// Run an Effect and return the result
export const runEffect = <A, E>(
  effect: Effect.Effect<A, E, never>
): Promise<A> => runtime.runPromise(effect)

// Run an Effect that might fail, returning Either
export const runEffectEither = <A, E>(
  effect: Effect.Effect<A, E, never>
) => runtime.runPromise(Effect.either(effect))

// Map AppError to HTTP response
export const errorToResponse = (c: Context, error: AppError) => {
  switch (error._tag) {
    case "NotFoundError":
      return c.json({ error: "Not Found", resource: error.resource, id: error.id }, 404)

    case "UnauthorizedError":
      return c.json({ error: "Unauthorized", reason: error.reason }, 401)

    case "ValidationError":
      return c.json({ error: "Validation Error", field: error.field, message: error.message }, 400)

    case "RateLimitError":
      return c.json(
        { error: "Rate Limit Exceeded", retryAfter: error.retryAfter },
        { status: 429, headers: { "Retry-After": String(error.retryAfter) } }
      )

    case "UploadError":
      return c.json({ error: "Upload Error", cause: error.cause, message: error.message }, 400)

    case "ProcessingError":
      return c.json({ error: "Processing Error", cause: error.cause, message: error.message }, 500)

    case "PaymentError":
      return c.json({ error: "Payment Error", cause: error.cause, message: error.message }, 402)

    default:
      // Exhaustive check - this should never happen if all error types are handled
      return c.json({ error: "Internal Server Error" }, 500)
  }
}

// Helper to handle Effect in Hono route handlers
export const handleEffect = <A>(
  c: Context,
  effect: Effect.Effect<A, AppError, never>,
  onSuccess: (result: A) => Response | Promise<Response>
): Promise<Response> =>
  runEffectEither(effect).then((result) =>
    result._tag === "Right" 
      ? onSuccess(result.right) 
      : errorToResponse(c, result.left)
  )
