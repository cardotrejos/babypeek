import { Effect, Context, Layer } from "effect"
import { PostHog } from "posthog-node"
import { env, isPostHogConfigured } from "../lib/env"

// =============================================================================
// PostHog Service Types
// =============================================================================

export interface PostHogEventProperties {
  [key: string]: unknown
}

// =============================================================================
// PostHog Service Definition
// =============================================================================

export class PostHogService extends Context.Tag("PostHogService")<
  PostHogService,
  {
    /**
     * Capture an analytics event
     * @param event - Event name
     * @param distinctId - User/session identifier
     * @param properties - Optional event properties
     */
    capture: (
      event: string,
      distinctId: string,
      properties?: PostHogEventProperties
    ) => Effect.Effect<void>

    /**
     * Identify a user with properties
     * @param distinctId - User/session identifier
     * @param properties - User properties
     */
    identify: (
      distinctId: string,
      properties?: PostHogEventProperties
    ) => Effect.Effect<void>

    /**
     * Flush pending events and shutdown client
     */
    shutdown: () => Effect.Effect<void>
  }
>() {}

// =============================================================================
// Cached PostHog Client
// =============================================================================

let cachedClient: PostHog | null = null

const getClient = (): PostHog | null => {
  if (!isPostHogConfigured()) {
    return null
  }

  if (!cachedClient) {
    cachedClient = new PostHog(env.POSTHOG_KEY!, {
      host: "https://app.posthog.com",
      flushAt: 20, // Batch size before flushing
      flushInterval: 10000, // Flush every 10 seconds
    })
  }

  return cachedClient
}

// =============================================================================
// PostHog Service Implementation
// =============================================================================

const capture = Effect.fn("PostHogService.capture")(function* (
  event: string,
  distinctId: string,
  properties?: PostHogEventProperties
) {
  yield* Effect.sync(() => {
    const client = getClient()
    if (!client) {
      if (env.NODE_ENV === "development") {
        console.log(`📊 [PostHog Mock] ${event}:`, { distinctId, ...properties })
      }
      return
    }

    client.capture({
      event,
      distinctId,
      properties,
    })
  })
})

const identify = Effect.fn("PostHogService.identify")(function* (
  distinctId: string,
  properties?: PostHogEventProperties
) {
  yield* Effect.sync(() => {
    const client = getClient()
    if (!client) {
      if (env.NODE_ENV === "development") {
        console.log(`📊 [PostHog Mock] identify:`, { distinctId, ...properties })
      }
      return
    }

    client.identify({
      distinctId,
      properties,
    })
  })
})

const shutdown = Effect.fn("PostHogService.shutdown")(function* () {
  yield* Effect.promise(async () => {
    const client = getClient()
    if (client) {
      await client.shutdown()
      cachedClient = null
    }
  })
})

export const PostHogServiceLive = Layer.succeed(PostHogService, {
  capture,
  identify,
  shutdown,
})

// =============================================================================
// Standalone Helper Functions (for use outside Effect context)
// =============================================================================

/**
 * Capture an event directly (for use in webhooks, etc.)
 */
export const captureEvent = (
  event: string,
  distinctId: string,
  properties?: PostHogEventProperties
) => {
  const client = getClient()
  if (client) {
    client.capture({ event, distinctId, properties })
  }
}

/**
 * Shutdown PostHog client (call on server shutdown)
 */
export const shutdownPostHog = async () => {
  const client = getClient()
  if (client) {
    await client.shutdown()
    cachedClient = null
  }
}
