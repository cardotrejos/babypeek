import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import { getSession, hasSession } from "@/lib/session"
import { posthog, isPostHogConfigured } from "@/lib/posthog"
import { useStatus, getStageLabel } from "@/hooks/use-status"

// API base URL - in production this will be the same origin
const API_BASE = import.meta.env.VITE_API_URL || ""

/**
 * Processing Page
 *
 * This route handles the AI image processing workflow.
 * It triggers the backend process endpoint on mount and shows processing status.
 *
 * Story 4.1: Fire-and-forget pattern - triggers workflow and shows UI
 * Story 4.6: Timeout handling with retry capability
 * Story 5.1: Full processing status page implementation (future)
 */
export const Route = createFileRoute("/processing/$jobId")({
  component: ProcessingPage,
})

type ProcessingState = "idle" | "starting" | "processing" | "error" | "already-processing" | "timeout" | "retrying" | "complete"

interface ProcessingError {
  message: string
  code?: string
  canRetry: boolean
  lastStage?: string
  lastProgress?: number
}

function ProcessingPage() {
  const { jobId } = Route.useParams()
  const navigate = useNavigate()

  const [state, setState] = useState<ProcessingState>("idle")
  const [error, setError] = useState<ProcessingError | null>(null)
  const [workflowRunId, setWorkflowRunId] = useState<string | null>(null)

  // Poll for status updates after workflow is started
  const shouldPoll = state === "processing" || state === "already-processing"
  const { 
    status: polledStatus, 
    stage, 
    progress, 
    isComplete, 
    isFailed, 
    resultId,
    errorMessage: polledErrorMessage 
  } = useStatus(shouldPoll ? jobId : null)

  // Handle completion - show success and navigate to home (or results when implemented)
  useEffect(() => {
    if (isComplete && resultId) {
      setState("complete")
      // Track completion
      if (isPostHogConfigured()) {
        posthog.capture("processing_complete", {
          upload_id: jobId,
          result_id: resultId,
        })
      }
      // For now, navigate to home with the result ID as a query param
      // In the future, this would navigate to a results/reveal page
      setTimeout(() => {
        // TODO: Navigate to results page when implemented
        // For now, just log success
        console.log("[processing] Complete! Result ID:", resultId)
      }, 1000)
    }
  }, [isComplete, resultId, jobId])

  // Handle failure from polling
  useEffect(() => {
    if (isFailed) {
      setError({
        message: polledErrorMessage || "Processing failed. Please try again.",
        code: "PROCESSING_FAILED",
        canRetry: true,
      })
      setState("error")
    }
  }, [isFailed, polledErrorMessage])

  const startProcessing = useCallback(async () => {
    // Check if we have a session for this job
    if (!hasSession(jobId)) {
      setError({
        message: "Session not found. Please start a new upload.",
        code: "SESSION_NOT_FOUND",
        canRetry: false,
      })
      setState("error")
      return
    }

    const sessionToken = getSession(jobId)
    if (!sessionToken) {
      setError({
        message: "Invalid session. Please start a new upload.",
        code: "INVALID_SESSION",
        canRetry: false,
      })
      setState("error")
      return
    }

    setState("starting")

    try {
      const response = await fetch(`${API_BASE}/api/process-workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
        body: JSON.stringify({ uploadId: jobId }),
      })

      const data = await response.json()

      if (response.status === 409) {
        // Already processing - that's fine, just poll for status
        setState("already-processing")
        if (data.workflowRunId) {
          setWorkflowRunId(data.workflowRunId)
        }
        return
      }

      if (!response.ok) {
        // Handle timeout specifically (AC-2, AC-3)
        if (response.status === 408 || data.code === "PROCESSING_TIMEOUT") {
          if (isPostHogConfigured()) {
            posthog.capture("processing_timeout_shown", {
              upload_id: jobId,
              last_stage: data.lastStage,
              last_progress: data.lastProgress,
            })
          }
          setError({
            message: "This is taking longer than expected. Let's try again!",
            code: "PROCESSING_TIMEOUT",
            canRetry: true,
            lastStage: data.lastStage,
            lastProgress: data.lastProgress,
          })
          setState("timeout")
          return
        }

        // Handle different error codes
        const errorMessage = getErrorMessage(response.status, data)
        setError({
          message: errorMessage,
          code: data.code,
          canRetry: data.canRetry ?? (response.status >= 500 || response.status === 0),
        })
        setState("error")
        return
      }

      // Success - processing started, now poll for status
      setState("processing")
      setWorkflowRunId(data.workflowRunId)
    } catch (err) {
      console.error("[processing] Error starting process:", err)
      setError({
        message: "Something went wrong. Please try again.",
        code: "NETWORK_ERROR",
        canRetry: true,
      })
      setState("error")
    }
  }, [jobId])

  // Start processing on mount
  useEffect(() => {
    if (state === "idle") {
      startProcessing()
    }
  }, [state, startProcessing])

  // Handle retry by calling the retry endpoint first, then restarting processing
  const handleRetry = async () => {
    const sessionToken = getSession(jobId)
    if (!sessionToken) {
      setError({
        message: "Session expired. Please start a new upload.",
        code: "SESSION_EXPIRED",
        canRetry: false,
      })
      setState("error")
      return
    }

    setState("retrying")

    try {
      // Track retry attempt
      if (isPostHogConfigured()) {
        posthog.capture("processing_retry_started", {
          upload_id: jobId,
        })
      }

      // First, reset the job state via retry endpoint
      const retryResponse = await fetch(`${API_BASE}/api/retry/${jobId}`, {
        method: "POST",
        headers: {
          "X-Session-Token": sessionToken,
        },
      })

      if (!retryResponse.ok) {
        const data = await retryResponse.json()
        throw new Error(data.error || "Failed to reset job for retry")
      }

      // Then restart processing
      setError(null)
      setState("idle")
    } catch (err) {
      console.error("[processing] Error during retry:", err)
      if (isPostHogConfigured()) {
        posthog.capture("processing_retry_failed", {
          upload_id: jobId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
      setError({
        message: "Couldn't start retry. Please try again.",
        code: "RETRY_FAILED",
        canRetry: true,
      })
      setState("error")
    }
  }

  const handleStartOver = () => {
    navigate({ to: "/" })
  }

  // Get display text based on polling stage
  const getProcessingText = () => {
    if (stage) {
      return getStageLabel(stage)
    }
    return "Our AI is working its magic. This usually takes about 60 seconds."
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-cream">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Loading states */}
        {(state === "idle" || state === "starting") && (
          <>
            <div className="flex justify-center">
              <div className="size-16 animate-spin rounded-full border-4 border-coral border-t-transparent" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl text-charcoal">
                Starting your transformation...
              </h1>
              <p className="font-body text-warm-gray">
                Getting everything ready for your portrait.
              </p>
            </div>
          </>
        )}

        {/* Processing state */}
        {(state === "processing" || state === "already-processing") && (
          <>
            <div className="flex justify-center">
              <div className="size-16 animate-spin rounded-full border-4 border-coral border-t-transparent" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl text-charcoal">
                Creating your portrait...
              </h1>
              <p className="font-body text-warm-gray">
                {getProcessingText()}
              </p>
            </div>
            {/* Progress bar */}
            {progress > 0 && (
              <div className="w-full bg-charcoal/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-coral h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {state === "already-processing" && (
              <p className="text-sm text-warm-gray/70">
                Your image is already being processed.
              </p>
            )}
            {/* Polled status debug (development only) */}
            {import.meta.env.DEV && polledStatus && (
              <p className="text-xs text-warm-gray/50 font-mono">
                Status: {polledStatus} | Stage: {stage || "none"} | Progress: {progress}%
              </p>
            )}
          </>
        )}

        {/* Complete state */}
        {state === "complete" && (
          <>
            <div className="flex justify-center">
              <div className="size-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  className="size-8 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl text-charcoal">
                Your portrait is ready!
              </h1>
              <p className="font-body text-warm-gray">
                Processing complete. Result ID: {resultId}
              </p>
            </div>
          </>
        )}

        {/* Retrying state */}
        {state === "retrying" && (
          <>
            <div className="flex justify-center">
              <div className="size-16 animate-spin rounded-full border-4 border-coral border-t-transparent" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl text-charcoal">
                Getting ready for another try...
              </h1>
              <p className="font-body text-warm-gray">
                Hang tight, we're setting things up.
              </p>
            </div>
          </>
        )}

        {/* Timeout state (AC-2, AC-3) */}
        {state === "timeout" && error && (
          <>
            <div className="flex justify-center">
              <div className="size-20 text-6xl flex items-center justify-center">
                :(
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl text-charcoal">
                This is taking longer than expected. Let's try again!
              </h1>
              <p className="font-body text-warm-gray max-w-md">
                Don't worry - these things happen. Your image is ready for another go!
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="px-8 py-4 bg-coral text-white font-body text-lg rounded-xl hover:bg-coral/90 transition-colors shadow-lg"
            >
              Let's try again
            </button>
            <p className="text-sm text-warm-gray/70 max-w-sm">
              If this keeps happening, your image might not be compatible.
              <br />
              Try with a clearer ultrasound image.
            </p>
          </>
        )}

        {/* Error state */}
        {state === "error" && error && (
          <>
            <div className="flex justify-center">
              <div className="size-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="size-8 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl text-charcoal">
                Oops! Something went wrong
              </h1>
              <p className="font-body text-warm-gray">{error.message}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {error.canRetry && (
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-coral text-white font-body rounded-lg hover:bg-coral/90 transition-colors"
                >
                  Try Again
                </button>
              )}
              <button
                onClick={handleStartOver}
                className="px-6 py-3 bg-charcoal/10 text-charcoal font-body rounded-lg hover:bg-charcoal/20 transition-colors"
              >
                Start Over
              </button>
            </div>
          </>
        )}

        {/* Debug info (development only) */}
        {import.meta.env.DEV && (
          <div className="text-xs text-warm-gray/50 font-mono space-y-1 pt-4 border-t border-warm-gray/20">
            <p>Job ID: {jobId}</p>
            <p>State: {state}</p>
            {workflowRunId && <p>Workflow Run: {workflowRunId}</p>}
            {error?.code && <p>Error Code: {error.code}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Get a user-friendly error message based on status code and response data
 */
function getErrorMessage(status: number, data: Record<string, unknown>): string {
  switch (status) {
    case 401:
      return "Your session has expired. Please start a new upload."
    case 404:
      return "We couldn't find your upload. Please try again."
    case 409:
      return "Your image is already being processed."
    case 429:
      return "Too many requests. Please wait a moment and try again."
    case 500:
    case 502:
    case 503:
      return "Our servers are having trouble. Please try again in a moment."
    default:
      return (data.error as string) || "Something went wrong. Please try again."
  }
}
