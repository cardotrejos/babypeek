import { useQuery } from "@tanstack/react-query"
import { useCallback, useEffect, useRef } from "react"

import { useAnalytics } from "@/hooks/use-analytics"
import { API_BASE_URL } from "@/lib/api-config"
import { getSession } from "@/lib/session"

// =============================================================================
// Types
// =============================================================================

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed"
export type ProcessingStage = "validating" | "generating" | "storing" | "watermarking" | "complete" | "failed" | null

interface StatusApiResponse {
  success: boolean
  status: ProcessingStatus
  stage: ProcessingStage
  progress: number
  resultId: string | null
  errorMessage: string | null
  updatedAt: string
  error?: {
    code: string
    message: string
  }
}

export interface UseStatusResult {
  /** Current processing status */
  status: ProcessingStatus | null
  /** Current processing stage for granular progress */
  stage: ProcessingStage
  /** Progress percentage (0-100) */
  progress: number
  /** Result ID when processing is complete */
  resultId: string | null
  /** Error message if processing failed */
  errorMessage: string | null
  /** Whether the initial fetch is loading */
  isLoading: boolean
  /** Whether processing has completed successfully */
  isComplete: boolean
  /** Whether processing has failed */
  isFailed: boolean
  /** Whether polling is currently active */
  isPolling: boolean
  /** Error from the query itself (network errors, etc) */
  error: Error | null
  /** Last updated timestamp from server */
  updatedAt: Date | null
}

// =============================================================================
// Constants
// =============================================================================

/** Polling interval in milliseconds (2.5 seconds as per story AC-5) */
const POLLING_INTERVAL = 2500

/** Sample rate for status_poll events (1 in N polls will be tracked to reduce volume) */
const POLL_SAMPLE_RATE = 10

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to poll for processing status updates.
 * 
 * Uses TanStack Query's refetchInterval to poll the status API
 * every 2-3 seconds until the job is complete or failed.
 * 
 * @param jobId - The job/upload ID to poll for, or null to disable
 * @returns Status information including stage, progress, and completion state
 * 
 * @example
 * ```tsx
 * const { status, stage, progress, isComplete, isFailed, resultId } = useStatus(jobId)
 * 
 * if (isComplete && resultId) {
 *   // Redirect to reveal page
 *   navigate(`/reveal/${resultId}`)
 * }
 * 
 * if (isFailed) {
 *   // Show error UI
 *   showError()
 * }
 * 
 * // Show progress bar
 * <ProgressBar value={progress} />
 * <p>Stage: {stage}</p>
 * ```
 */
export function useStatus(jobId: string | null): UseStatusResult {
  // Get session token from localStorage
  const sessionToken = jobId ? getSession(jobId) : null
  const { trackEvent } = useAnalytics()

  // Track when polling started for duration calculation
  const pollingStartTimeRef = useRef<number | null>(null)
  // Track if we've already fired completion/failure events
  const completionTrackedRef = useRef<boolean>(false)
  // Counter for sampling status_poll events
  const pollCountRef = useRef<number>(0)

  // Memoize trackEvent to prevent unnecessary effect re-runs
  const stableTrackEvent = useCallback(trackEvent, [trackEvent])

  const { data, isLoading, error, isFetching } = useQuery<StatusApiResponse>({
    queryKey: ["status", jobId],
    queryFn: async (): Promise<StatusApiResponse> => {
      if (!jobId || !sessionToken) {
        throw new Error("Missing job ID or session")
      }

      const response = await fetch(`${API_BASE_URL}/api/status/${jobId}`, {
        headers: {
          "X-Session-Token": sessionToken,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error?.message || `Failed to fetch status: ${response.status}`
        throw new Error(errorMessage)
      }

      return response.json()
    },

    // Only enable when we have both jobId and sessionToken
    enabled: Boolean(jobId) && Boolean(sessionToken),

    // Poll every 2.5 seconds until complete or failed
    refetchInterval: (query) => {
      const data = query.state.data
      // Stop polling when complete or failed
      if (data?.status === "completed" || data?.status === "failed") {
        return false
      }
      return POLLING_INTERVAL
    },

    // Keep previous data while fetching to prevent flicker
    placeholderData: (previousData) => previousData,

    // Don't refetch on window focus during polling (we're already polling)
    refetchOnWindowFocus: false,

    // Retry on error (network issues, etc)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Stale time of 2 seconds - since we're polling frequently anyway
    staleTime: 2000,
  })

  // Derive computed states
  const isComplete = data?.status === "completed"
  const isFailed = data?.status === "failed"
  const isPolling = isFetching && !isLoading && !isComplete && !isFailed

  // Analytics tracking effect
  useEffect(() => {
    if (!data || !jobId) return

    // Track polling start time on first data
    if (pollingStartTimeRef.current === null && data.status === "processing") {
      pollingStartTimeRef.current = Date.now()
    }

    // Sample status_poll events (1 in N to reduce volume)
    pollCountRef.current += 1
    if (pollCountRef.current % POLL_SAMPLE_RATE === 0 && data.status === "processing") {
      stableTrackEvent("status_poll", {
        upload_id: jobId,
        stage: data.stage,
        progress: data.progress,
      })
    }

    // Track completion events (only once)
    if (data.status === "completed" && !completionTrackedRef.current) {
      completionTrackedRef.current = true
      const totalDuration = pollingStartTimeRef.current
        ? Date.now() - pollingStartTimeRef.current
        : 0

      stableTrackEvent("status_complete", {
        upload_id: jobId,
        result_id: data.resultId,
        total_duration_ms: totalDuration,
      })
    }

    // Track failure events (only once)
    if (data.status === "failed" && !completionTrackedRef.current) {
      completionTrackedRef.current = true

      stableTrackEvent("status_failed", {
        upload_id: jobId,
        final_stage: data.stage,
        final_progress: data.progress,
        error_message: data.errorMessage,
      })
    }

  }, [data, jobId, stableTrackEvent])

  // Reset tracking refs when jobId changes
  useEffect(() => {
    pollingStartTimeRef.current = null
    completionTrackedRef.current = false
    pollCountRef.current = 0
  }, [jobId])

  return {
    status: data?.status ?? null,
    stage: data?.stage ?? null,
    progress: data?.progress ?? 0,
    resultId: data?.resultId ?? null,
    errorMessage: data?.errorMessage ?? null,
    isLoading,
    isComplete,
    isFailed,
    isPolling,
    error: error as Error | null,
    updatedAt: data?.updatedAt ? new Date(data.updatedAt) : null,
  }
}

// =============================================================================
// Stage Labels for UI
// =============================================================================

/**
 * Get human-readable label for a processing stage
 */
export function getStageLabel(stage: ProcessingStage): string {
  switch (stage) {
    case "validating":
      return "Preparing your image..."
    case "generating":
      return "Creating your portrait..."
    case "storing":
      return "Saving your masterpiece..."
    case "watermarking":
      return "Adding final touches..."
    case "complete":
      return "Complete!"
    case "failed":
      return "Something went wrong"
    default:
      return "Processing..."
  }
}

/**
 * Get emoji for a processing stage (optional, for fun UI)
 */
export function getStageEmoji(stage: ProcessingStage): string {
  switch (stage) {
    case "validating":
      return "🔍"
    case "generating":
      return "🎨"
    case "storing":
      return "💾"
    case "watermarking":
      return "✨"
    case "complete":
      return "🎉"
    case "failed":
      return "😢"
    default:
      return "⏳"
  }
}
