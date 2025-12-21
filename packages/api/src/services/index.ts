import { Layer } from "effect"

// =============================================================================
// Service Exports
// =============================================================================

export * from "./GeminiService"
export * from "./R2Service"
export * from "./StripeService"
export * from "./ResendService"
export * from "./UploadService"
export * from "./ResultService"
export * from "./PostHogService"
export * from "./RateLimitService"

// =============================================================================
// Import Layers for Composition
// =============================================================================

import { GeminiServiceLive } from "./GeminiService"
import { R2ServiceLive } from "./R2Service"
import { StripeServiceLive } from "./StripeService"
import { ResendServiceLive } from "./ResendService"
import { UploadServiceLive } from "./UploadService"
import { ResultServiceLive } from "./ResultService"
import { PostHogServiceLive } from "./PostHogService"
import { RateLimitServiceLive } from "./RateLimitService"

// =============================================================================
// AppServicesLive - Composed Layer with All Services
// =============================================================================

export const AppServicesLive = Layer.mergeAll(
  GeminiServiceLive,
  R2ServiceLive,
  StripeServiceLive,
  ResendServiceLive,
  UploadServiceLive,
  ResultServiceLive,
  PostHogServiceLive,
  RateLimitServiceLive
)
