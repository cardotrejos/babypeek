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
export * from "./WatermarkService"
export * from "./PurchaseService"

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
import { WatermarkServiceLive } from "./WatermarkService"
import { PurchaseServiceLive } from "./PurchaseService"

// =============================================================================
// AppServicesLive - Composed Layer with All Services
// =============================================================================

// ResultServiceLive depends on R2Service, so we need to provide it
const ResultServiceWithDeps = ResultServiceLive.pipe(Layer.provide(R2ServiceLive))

// PurchaseServiceLive depends on StripeService
const PurchaseServiceWithDeps = PurchaseServiceLive.pipe(Layer.provide(StripeServiceLive))

export const AppServicesLive = Layer.mergeAll(
  GeminiServiceLive,
  R2ServiceLive,
  StripeServiceLive,
  ResendServiceLive,
  UploadServiceLive,
  ResultServiceWithDeps,
  PostHogServiceLive,
  RateLimitServiceLive,
  WatermarkServiceLive,
  PurchaseServiceWithDeps
)
