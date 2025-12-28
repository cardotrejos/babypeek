import { usePostHog } from "posthog-js/react";
import { useCallback } from "react";

// =============================================================================
// Analytics Event Types
// =============================================================================

export type AnalyticsEvent =
  | "upload_started"
  | "upload_completed"
  | "upload_failed"
  | "upload_validation_error"
  | "upload_file_selected"
  | "upload_form_completed"
  | "upload_progress"
  | "upload_cancelled"
  | "upload_confirmed"
  | "upload_stage_timing"
  | "upload_cleanup_triggered"
  | "rate_limit_exceeded"
  | "presigned_url_requested"
  | "email_entered"
  | "email_validation_error"
  | "session_created"
  | "heic_conversion_started"
  | "heic_conversion_completed"
  | "heic_conversion_error"
  | "heic_large_file_warning"
  | "compression_started"
  | "compression_completed"
  | "compression_skipped"
  | "compression_failed"
  | "processing_started"
  | "processing_completed"
  | "processing_failed"
  | "status_poll"
  | "status_complete"
  | "status_failed"
  | "reveal_viewed"
  | "checkout_started"
  | "checkout_completed"
  | "checkout_failed"
  | "download_initiated"
  | "share_clicked";

export interface UploadEventProperties {
  file_type?: string;
  file_size?: number;
  duration_ms?: number;
  error?: string;
  type?: "file_type" | "file_size";
}

export interface ProcessingEventProperties {
  job_id?: string;
  duration_ms?: number;
  stage?: string;
  error?: string;
}

export interface CheckoutEventProperties {
  price?: number;
  type?: "self" | "gift";
  error?: string;
}

export interface DownloadEventProperties {
  purchase_id?: string;
}

export interface ShareEventProperties {
  platform?: "whatsapp" | "imessage" | "copy_link" | "instagram";
}

// =============================================================================
// Compression Event Types (Story 3.3)
// =============================================================================

export interface CompressionStartedProperties {
  fileSize: number;
  fileSizeMB: number;
  fileType: string;
}

export interface CompressionCompletedProperties {
  durationMs: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface CompressionSkippedProperties {
  reason: "under_threshold" | "gif_file" | "already_optimized";
  fileSize: number;
  fileSizeMB?: number;
  compressionRatio?: number;
}

export interface CompressionFailedProperties {
  errorType: string;
  fileSize: number;
}

type EventProperties =
  | UploadEventProperties
  | ProcessingEventProperties
  | CheckoutEventProperties
  | DownloadEventProperties
  | ShareEventProperties
  | CompressionStartedProperties
  | CompressionCompletedProperties
  | CompressionSkippedProperties
  | CompressionFailedProperties
  | Record<string, unknown>;

// =============================================================================
// Analytics Hook
// =============================================================================

export function useAnalytics() {
  const posthog = usePostHog();

  /**
   * Identify user by session token
   * Call this when a session is created (e.g., after upload)
   */
  const identify = useCallback(
    (sessionToken: string, properties?: Record<string, unknown>) => {
      posthog?.identify(sessionToken, properties);
    },
    [posthog],
  );

  /**
   * Reset identity (e.g., when user starts fresh)
   */
  const reset = useCallback(() => {
    posthog?.reset();
  }, [posthog]);

  /**
   * Track a custom event
   */
  const trackEvent = useCallback(
    (event: AnalyticsEvent | string, properties?: EventProperties) => {
      posthog?.capture(event, properties);
    },
    [posthog],
  );

  // =============================================================================
  // Convenience Methods for Common Events
  // =============================================================================

  const trackUploadStarted = useCallback(
    (properties: UploadEventProperties) => {
      trackEvent("upload_started", properties);
    },
    [trackEvent],
  );

  const trackUploadCompleted = useCallback(
    (properties: UploadEventProperties) => {
      trackEvent("upload_completed", properties);
    },
    [trackEvent],
  );

  const trackUploadFailed = useCallback(
    (error: string, properties?: UploadEventProperties) => {
      trackEvent("upload_failed", { ...properties, error });
    },
    [trackEvent],
  );

  const trackProcessingStarted = useCallback(
    (jobId: string) => {
      trackEvent("processing_started", { job_id: jobId });
    },
    [trackEvent],
  );

  const trackProcessingCompleted = useCallback(
    (jobId: string, durationMs: number) => {
      trackEvent("processing_completed", { job_id: jobId, duration_ms: durationMs });
    },
    [trackEvent],
  );

  const trackRevealViewed = useCallback(
    (jobId: string) => {
      trackEvent("reveal_viewed", { job_id: jobId });
    },
    [trackEvent],
  );

  const trackCheckoutStarted = useCallback(
    (price: number, type: "self" | "gift") => {
      trackEvent("checkout_started", { price, type });
    },
    [trackEvent],
  );

  const trackDownloadInitiated = useCallback(
    (purchaseId: string) => {
      trackEvent("download_initiated", { purchase_id: purchaseId });
    },
    [trackEvent],
  );

  const trackShareClicked = useCallback(
    (platform: ShareEventProperties["platform"]) => {
      trackEvent("share_clicked", { platform });
    },
    [trackEvent],
  );

  return {
    // Core methods
    identify,
    reset,
    trackEvent,
    // Convenience methods
    trackUploadStarted,
    trackUploadCompleted,
    trackUploadFailed,
    trackProcessingStarted,
    trackProcessingCompleted,
    trackRevealViewed,
    trackCheckoutStarted,
    trackDownloadInitiated,
    trackShareClicked,
  };
}
