import { Layer } from "effect";

// =============================================================================
// Service Exports
// =============================================================================

export * from "./FalService";
export * from "./R2Service";
export * from "./StripeService";
export * from "./ResendService";
export * from "./UploadService";
export * from "./ResultService";
export * from "./PostHogService";
export * from "./WatermarkService";
export * from "./PurchaseService";
export * from "./CleanupService";
export * from "./FacebookConversionsService";

// =============================================================================
// Import Layers for Composition
// =============================================================================

import { FalServiceLive } from "./FalService";
import { R2ServiceLive } from "./R2Service";
import { StripeServiceLive } from "./StripeService";
import { ResendServiceLive } from "./ResendService";
import { UploadServiceLive } from "./UploadService";
import { ResultServiceLive } from "./ResultService";
import { PostHogServiceLive } from "./PostHogService";
import { WatermarkServiceLive } from "./WatermarkService";
import { PurchaseServiceLive } from "./PurchaseService";

// =============================================================================
// AppServicesLive - Composed Layer with All Services
// =============================================================================

// ResultServiceLive depends on R2Service, so we need to provide it
const ResultServiceWithDeps = ResultServiceLive.pipe(Layer.provide(R2ServiceLive));

// PurchaseServiceLive depends on StripeService
const PurchaseServiceWithDeps = PurchaseServiceLive.pipe(Layer.provide(StripeServiceLive));

export const AppServicesLive = Layer.mergeAll(
  FalServiceLive,
  R2ServiceLive,
  StripeServiceLive,
  ResendServiceLive,
  UploadServiceLive,
  ResultServiceWithDeps,
  PostHogServiceLive,
  WatermarkServiceLive,
  PurchaseServiceWithDeps,
);
