import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import * as Sentry from "@sentry/react";

import { useAnalytics } from "@/hooks/use-analytics";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { API_BASE_URL } from "@/lib/api-config";
import { storeSession } from "@/lib/session";
import { categorizeError } from "@/lib/upload-errors";
import { getAnalyticsContext } from "@/lib/analytics-context";
import { startUploadAttempt } from "@/lib/upload-session";

// =============================================================================
// Constants
// =============================================================================

/** Upload timeout in milliseconds (90 seconds - increased for slow mobile connections) */
const UPLOAD_TIMEOUT = 90 * 1000;

/** Progress milestone percentages for analytics */
const PROGRESS_MILESTONES = [25, 50, 75] as const;

/** Toast duration for error messages */
const TOAST_ERROR_DURATION = 5000;

// =============================================================================
// Types
// =============================================================================

export type UploadStatus = "idle" | "requesting" | "uploading" | "complete" | "error";

export interface UploadState {
  status: UploadStatus;
  progress: number;
  uploadId: string | null;
  error: string | null;
  /** Current retry attempt (0 = first attempt) */
  retryCount: number;
  /** Whether auto-retry is in progress */
  autoRetrying: boolean;
}

export interface UploadResult {
  uploadId: string;
  key: string;
  sessionToken: string;
}

export interface UseUploadResult {
  state: UploadState;
  startUpload: (file: File, email: string) => Promise<UploadResult | null>;
  cancelUpload: () => void;
  reset: () => void;
  /** Whether the user is currently online (useful for UI hints) */
  isOnline: boolean;
}

interface PresignedUrlResponse {
  uploadUrl: string;
  uploadId: string;
  key: string;
  expiresAt: string;
  sessionToken: string;
}

interface ConfirmUploadResponse {
  success: boolean;
  jobId: string;
  status: string;
}

interface RateLimitErrorResponse {
  error: string;
  code: "RATE_LIMIT_EXCEEDED";
  retryAfter: number;
}

/** Custom error class for rate limiting */
class RateLimitError extends Error {
  retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

// =============================================================================
// Helpers
// =============================================================================

const initialState: UploadState = {
  status: "idle",
  progress: 0,
  uploadId: null,
  error: null,
  retryCount: 0,
  autoRetrying: false,
};

// =============================================================================
// Hook
// =============================================================================

export function useUpload(): UseUploadResult {
  const [state, setState] = useState<UploadState>(initialState);
  const { trackEvent } = useAnalytics();
  const { isOnline, checkStatus } = useOnlineStatus();

  // Refs for cancellation and milestone tracking
  const abortControllerRef = useRef<AbortController | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const passedMilestonesRef = useRef<Set<number>>(new Set());
  const progressRef = useRef<number>(0);
  const currentPhaseRef = useRef<"idle" | "requesting" | "uploading">("idle");

  /**
   * Request a presigned upload URL from the server
   */
  const requestPresignedUrl = useCallback(
    async (
      contentType: string,
      email: string,
      signal: AbortSignal,
    ): Promise<PresignedUrlResponse> => {
      const startTime = performance.now();

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentType, email }),
        signal,
      });

      const latencyMs = Math.round(performance.now() - startTime);
      trackEvent("presigned_url_requested", { latencyMs });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as
          | RateLimitErrorResponse
          | { error?: string };

        // Handle rate limit specifically
        if (response.status === 429 && "retryAfter" in errorData) {
          throw new RateLimitError(errorData.error || "Rate limit exceeded", errorData.retryAfter);
        }

        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      return response.json();
    },
    [trackEvent],
  );

  /**
   * Confirm upload completion with the server
   */
  const confirmUpload = useCallback(
    async (uploadId: string, signal: AbortSignal): Promise<ConfirmUploadResponse> => {
      const response = await fetch(`${API_BASE_URL}/api/upload/${uploadId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Confirmation failed: ${response.status}`);
      }

      const data = await response.json();
      trackEvent("upload_confirmed", { upload_id: uploadId });
      return data;
    },
    [trackEvent],
  );

  /**
   * Clean up a partial/failed upload from R2 storage.
   * Fire-and-forget - doesn't block or report errors to UI.
   */
  const cleanupUpload = useCallback(
    async (uploadId: string, sessionToken: string) => {
      try {
        // Fire and forget - don't await or block on this
        fetch(`${API_BASE_URL}/api/upload/${uploadId}`, {
          method: "DELETE",
          headers: {
            "X-Session-Token": sessionToken,
          },
        }).catch(() => {
          // Silent fail - cleanup is best-effort
        });

        // Track cleanup event
        trackEvent("upload_cleanup_triggered", { upload_id: uploadId });
      } catch {
        // Silent fail - cleanup is best-effort
      }
    },
    [trackEvent],
  );

  /**
   * Upload file to R2 using presigned URL with progress tracking
   */
  const uploadToR2 = useCallback(
    (url: string, file: File, onProgress: (percent: number) => void): Promise<void> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        // Track upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);

            // Track milestone events
            for (const milestone of PROGRESS_MILESTONES) {
              if (percent >= milestone && !passedMilestonesRef.current.has(milestone)) {
                passedMilestonesRef.current.add(milestone);
                trackEvent("upload_progress", { percent, milestone });
              }
            }
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Network error during upload"));
        };

        xhr.onabort = () => {
          reject(new Error("Upload cancelled"));
        };

        xhr.ontimeout = () => {
          reject(new Error("Upload timed out"));
        };

        // Set timeout
        xhr.timeout = UPLOAD_TIMEOUT;

        // Open and send request
        xhr.open("PUT", url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
    },
    [trackEvent],
  );

  /**
   * Start the upload process
   */
  const startUpload = useCallback(
    async (file: File, email: string): Promise<UploadResult | null> => {
      // Get session info and analytics context early for all error paths
      const sessionInfo = startUploadAttempt();
      const analyticsContext = getAnalyticsContext();

      // Check online status before starting
      const currentlyOnline = checkStatus();
      if (!currentlyOnline) {
        const offlineError = {
          type: "NETWORK" as const,
          message: "User is offline",
          userMessage:
            "You appear to be offline. Please check your internet connection and try again!",
          retryable: true,
        };

        trackEvent("upload_failed", {
          errorType: "NETWORK",
          errorMessage: "User is offline",
          file_size: file.size,
          file_type: file.type,
          phase: "idle",
          ...sessionInfo,
          ...analyticsContext,
        });

        toast.error(offlineError.userMessage, { duration: TOAST_ERROR_DURATION });

        setState((prev) => ({
          status: "error",
          progress: 0,
          uploadId: null,
          error: offlineError.userMessage,
          retryCount: prev.retryCount + 1,
          autoRetrying: false,
        }));

        return null;
      }

      // Reset milestones
      passedMilestonesRef.current.clear();
      currentPhaseRef.current = "idle";

      // Create abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const startTime = performance.now();

      // Track timing for each phase
      const timings = {
        presignStart: 0,
        presignEnd: 0,
        uploadStart: 0,
        uploadEnd: 0,
      };

      try {
        // Track upload started with enriched context
        trackEvent("upload_started", {
          file_type: file.type,
          file_size: file.size,
          ...sessionInfo,
          ...analyticsContext,
        });

        // Phase 1: Request presigned URL
        currentPhaseRef.current = "requesting";
        setState((prev) => ({
          status: "requesting",
          progress: 0,
          uploadId: null,
          error: null,
          retryCount: prev.retryCount,
          autoRetrying: prev.autoRetrying,
        }));

        timings.presignStart = performance.now();
        const presignedData = await requestPresignedUrl(file.type, email, abortController.signal);
        timings.presignEnd = performance.now();

        // Check if cancelled
        if (abortController.signal.aborted) {
          return null;
        }

        // Phase 2: Upload to R2
        currentPhaseRef.current = "uploading";
        setState((prev) => ({
          ...prev,
          status: "uploading",
          uploadId: presignedData.uploadId,
        }));

        timings.uploadStart = performance.now();
        try {
          await uploadToR2(presignedData.uploadUrl, file, (percent) => {
            progressRef.current = percent;
            setState((prev) => ({
              ...prev,
              progress: percent,
            }));
          });
          timings.uploadEnd = performance.now();
        } catch (uploadError) {
          timings.uploadEnd = performance.now();
          // Clean up partial upload on R2 failure (fire and forget)
          cleanupUpload(presignedData.uploadId, presignedData.sessionToken);
          throw uploadError;
        }

        // Check if cancelled before confirmation
        if (abortController.signal.aborted) {
          return null;
        }

        // Phase 3: Confirm upload with server
        await confirmUpload(presignedData.uploadId, abortController.signal);

        // Phase 4: Store session in localStorage
        storeSession(presignedData.uploadId, presignedData.sessionToken);

        // Track session creation
        trackEvent("session_created", { upload_id: presignedData.uploadId });

        // Upload complete - calculate all timings
        const endTime = performance.now();
        const totalDuration = Math.round(endTime - startTime);
        const presignLatency = Math.round(timings.presignEnd - timings.presignStart);
        const uploadDuration = Math.round(timings.uploadEnd - timings.uploadStart);

        // Track upload completed with detailed timing breakdown
        trackEvent("upload_completed", {
          upload_id: presignedData.uploadId,
          file_size: file.size,
          file_type: file.type,
          // Timing breakdown
          duration_ms: totalDuration,
          total_duration: totalDuration,
          presign_latency: presignLatency,
          upload_duration: uploadDuration,
          // Session & context
          ...sessionInfo,
          ...analyticsContext,
        });

        // Also track a separate stage timing event for detailed funnel analysis
        trackEvent("upload_stage_timing", {
          upload_id: presignedData.uploadId,
          presign_latency: presignLatency,
          upload_duration: uploadDuration,
          total_duration: totalDuration,
          ...sessionInfo,
        });

        setState({
          status: "complete",
          progress: 100,
          uploadId: presignedData.uploadId,
          error: null,
          retryCount: 0,
          autoRetrying: false,
        });

        return {
          uploadId: presignedData.uploadId,
          key: presignedData.key,
          sessionToken: presignedData.sessionToken,
        };
      } catch (error) {
        // Handle cancellation separately (no error toast)
        if (
          error instanceof Error &&
          (error.message === "Upload cancelled" || error.name === "AbortError")
        ) {
          // Use ref for accurate progress at cancellation time
          trackEvent("upload_cancelled", { progressPercent: progressRef.current });

          progressRef.current = 0;
          setState(initialState);
          return null;
        }

        // Handle rate limit errors specifically
        if (error instanceof RateLimitError) {
          const retryAfterMinutes = Math.ceil(error.retryAfter / 60);
          const userMessage =
            retryAfterMinutes > 1
              ? `Upload limit reached. Try again in ${retryAfterMinutes} minutes.`
              : "You've reached the upload limit. Please try again later.";

          trackEvent("rate_limit_exceeded", {
            retryAfter: error.retryAfter,
            file_type: file.type,
            file_size: file.size,
            ...sessionInfo,
            ...analyticsContext,
          });

          toast.error(userMessage, { duration: TOAST_ERROR_DURATION });

          setState((prev) => ({
            status: "error",
            progress: 0,
            uploadId: null,
            error: userMessage,
            retryCount: prev.retryCount + 1,
            autoRetrying: false,
          }));

          return null;
        }

        // Categorize the error for better handling and reporting
        const categorizedError = categorizeError(error);

        trackEvent("upload_failed", {
          errorType: categorizedError.type,
          errorMessage: categorizedError.message,
          file_size: file.size,
          file_type: file.type,
          phase: currentPhaseRef.current, // Use ref for accurate phase at error time
          ...sessionInfo,
          ...analyticsContext,
        });

        // Report to Sentry with enhanced context (no PII)
        Sentry.captureException(error, {
          tags: {
            component: "use-upload",
            action: "upload",
            errorCategory: categorizedError.type,
            phase: currentPhaseRef.current,
          },
          extra: {
            fileSize: file.size,
            fileType: file.type,
            errorType: categorizedError.type,
            errorMessage: categorizedError.message,
            progress: progressRef.current,
            retryable: categorizedError.retryable,
            // NO email, NO IP, NO identifiable info
          },
          fingerprint: ["upload-error", categorizedError.type],
        });

        // Show user-friendly error
        const userMessage =
          categorizedError.userMessage || getErrorMessage(categorizedError.message);
        toast.error(userMessage, { duration: TOAST_ERROR_DURATION });

        setState((prev) => ({
          status: "error",
          progress: 0,
          uploadId: null,
          error: userMessage,
          retryCount: prev.retryCount + 1,
          autoRetrying: false,
        }));

        return null;
      } finally {
        abortControllerRef.current = null;
        xhrRef.current = null;
      }
    },
    [requestPresignedUrl, uploadToR2, confirmUpload, trackEvent, cleanupUpload],
  );

  /**
   * Cancel the current upload
   */
  const cancelUpload = useCallback(() => {
    // Abort fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Abort XMLHttpRequest
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
  }, []);

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    cancelUpload();
    setState(initialState);
    passedMilestonesRef.current.clear();
    progressRef.current = 0;
  }, [cancelUpload]);

  return {
    state,
    startUpload,
    cancelUpload,
    reset,
    isOnline,
  };
}

// =============================================================================
// Error Message Helpers
// =============================================================================

function getErrorMessage(errorType: string): string {
  if (errorType.includes("Network")) {
    return "We couldn't upload your image. Please check your connection and try again!";
  }
  if (errorType.includes("timeout") || errorType.includes("timed out")) {
    return "The upload took too long. Please check your connection and try again.";
  }
  if (errorType.includes("Server") || errorType.includes("500")) {
    return "Something went wrong on our end. Let's give it another try!";
  }
  return "We had trouble uploading your image. Let's try again!";
}
