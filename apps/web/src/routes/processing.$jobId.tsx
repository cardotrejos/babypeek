import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { z } from "zod";
import { getSession, hasSession, updateJobStatus, updateJobResult } from "@/lib/session";
import { posthog, isPostHogConfigured } from "@/lib/posthog";
import { useStatus } from "@/hooks/use-status";
import { usePreloadImage } from "@/hooks/use-preload-image";
import { useVisibilityChange } from "@/hooks/use-visibility-change";
import { useTabCoordinator } from "@/hooks/use-tab-coordinator";
import { ProcessingScreen } from "@/components/processing";
import { API_BASE_URL } from "@/lib/api-config";

/**
 * Processing Page
 *
 * This route handles the AI image processing workflow.
 * It triggers the backend process endpoint on mount and shows processing status.
 *
 * Story 4.1: Fire-and-forget pattern - triggers workflow and shows UI
 * Story 4.6: Timeout handling with retry capability
 * Story 5.1: Full processing status page implementation (future)
 *
 * Add ?prompts=true to URL to show prompt selector (for testing)
 */
export const Route = createFileRoute("/processing/$jobId")({
  component: ProcessingPage,
  validateSearch: z.object({
    prompts: z.boolean().optional(),
    promptVersion: z.enum(["v3", "v3-json", "v4", "v4-json"]).optional(),
  }),
});

type ProcessingState =
  | "idle"
  | "starting"
  | "processing"
  | "error"
  | "already-processing"
  | "timeout"
  | "retrying"
  | "complete";

type PromptVersion = "v3" | "v3-json" | "v4" | "v4-json";

const PROMPT_OPTIONS: { value: PromptVersion; label: string }[] = [
  { value: "v4", label: "v4 - National Geographic Style (default)" },
  { value: "v4-json", label: "v4-json - National Geographic (JSON)" },
  { value: "v3", label: "v3 - Close-up In-utero Style" },
  { value: "v3-json", label: "v3-json - Close-up (JSON)" },
];

interface ProcessingError {
  message: string;
  code?: string;
  canRetry: boolean;
  lastStage?: string;
  lastProgress?: number;
}

function ProcessingPage() {
  const { jobId } = Route.useParams();
  const { prompts: showPromptSelector, promptVersion: urlPromptVersion } = Route.useSearch();
  const navigate = useNavigate();

  const [state, setState] = useState<ProcessingState>("idle");
  const [error, setError] = useState<ProcessingError | null>(null);
  const [workflowRunId, setWorkflowRunId] = useState<string | null>(null);
  // Use URL prompt version if provided, otherwise default
  const [selectedPrompt, setSelectedPrompt] = useState<PromptVersion>(urlPromptVersion || "v4");

  // Story 5.7: Tab coordination - only leader tab polls (AC8)
  const shouldCoordinate = state === "processing" || state === "already-processing";
  const { isLeader, statusUpdate, broadcast, requestRefetch, refetchRequested } = useTabCoordinator(
    shouldCoordinate ? jobId : null,
    { enabled: shouldCoordinate },
  );

  // Poll for status updates only if this tab is the leader
  const shouldPoll = shouldCoordinate && isLeader;
  const {
    stage: polledStage,
    progress: polledProgress,
    isComplete: polledIsComplete,
    isFailed: polledIsFailed,
    resultId: polledResultId,
    resultUrl: polledResultUrl,
    promptVersion: polledPromptVersion,
    errorMessage: polledErrorMessage,
    refetch: refetchStatus,
  } = useStatus(shouldPoll ? jobId : null);

  // Story 5.7: Merge polled status with updates from leader tab (AC8)
  // If we have a status update from another tab, use it; otherwise use polled data
  const stage = statusUpdate?.stage !== undefined ? statusUpdate.stage : polledStage;
  const progress = statusUpdate?.progress ?? polledProgress;
  const isComplete = statusUpdate?.status === "completed" || polledIsComplete;
  const isFailed = statusUpdate?.status === "failed" || polledIsFailed;
  const resultId = statusUpdate?.resultId !== undefined ? statusUpdate.resultId : polledResultId;
  const resultUrl =
    statusUpdate?.resultUrl !== undefined ? statusUpdate.resultUrl : polledResultUrl;
  const promptVersion = polledPromptVersion; // Only from polling

  // Broadcast status updates to other tabs when we're the leader
  const lastBroadcastRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLeader && shouldCoordinate) {
      const leaderStatus = polledIsComplete
        ? "completed"
        : polledIsFailed
          ? "failed"
          : "processing";

      const payload = {
        jobId,
        status: leaderStatus,
        stage: polledStage,
        progress: polledProgress,
        resultId: polledResultId,
        resultUrl: polledResultUrl,
        errorMessage: polledErrorMessage,
      };

      // Avoid redundant cross-tab spam when payload is unchanged
      const serialized = JSON.stringify(payload);
      if (lastBroadcastRef.current === serialized) return;
      lastBroadcastRef.current = serialized;

      broadcast(payload);
    }
  }, [
    isLeader,
    shouldCoordinate,
    jobId,
    polledStage,
    polledProgress,
    polledIsComplete,
    polledIsFailed,
    polledResultId,
    polledResultUrl,
    polledErrorMessage,
    broadcast,
  ]);

  // Story 5.7: If another tab asks for a refetch and we're leader, do it now (AC1, AC8)
  useEffect(() => {
    if (!shouldPoll) return;
    if (refetchRequested <= 0) return;
    void refetchStatus();
  }, [shouldPoll, refetchRequested, refetchStatus]);

  // Preload image when progress >= 80% (AC-6: Story 5.3)
  // Start preloading early to ensure smooth reveal experience
  const shouldPreload = progress >= 80 && resultUrl;
  const { isLoaded: imagePreloaded } = usePreloadImage(shouldPreload ? resultUrl : null);

  // Track preload completion
  useEffect(() => {
    if (imagePreloaded && isPostHogConfigured()) {
      posthog.capture("image_preloaded", {
        upload_id: jobId,
        progress_at_preload: progress,
      });
    }
  }, [imagePreloaded, jobId, progress]);

  // Story 5.7: Handle visibility change for session recovery (AC1, AC2, AC3)
  // Ref to track if we've already handled a visibility change to prevent double-firing
  const isRefetchingRef = useRef(false);

  useVisibilityChange(
    useCallback(async () => {
      if (!shouldCoordinate) return;
      if (isRefetchingRef.current) return;

      isRefetchingRef.current = true;

      try {
        if (isPostHogConfigured()) {
          posthog.capture("visibility_returned", {
            upload_id: jobId,
            previous_state: state,
            previous_progress: progress,
            is_leader: isLeader,
          });
        }

        // If we're the leader, refetch immediately. Otherwise ask the leader to refetch.
        if (shouldPoll) {
          await refetchStatus();
        } else {
          requestRefetch();
        }
      } catch (err) {
        console.error("[processing] Error refetching status on visibility return:", err);
      } finally {
        isRefetchingRef.current = false;
      }
    }, [
      shouldCoordinate,
      shouldPoll,
      refetchStatus,
      requestRefetch,
      jobId,
      state,
      progress,
      isLeader,
    ]),
    { enabled: shouldCoordinate },
  );

  // Handle completion - navigate to reveal page (Story 5.3)
  useEffect(() => {
    if (isComplete && resultId) {
      setState("complete");
      // Track completion
      if (isPostHogConfigured()) {
        posthog.capture("processing_complete", {
          upload_id: jobId,
          result_id: resultId,
        });
      }
      // Store mapping of result -> upload for session token retrieval
      localStorage.setItem(`babypeek-result-upload-${resultId}`, jobId);
      // Story 5.7: Update session with result for recovery
      updateJobResult(jobId, resultId);

      // Navigate to reveal page
      setTimeout(() => {
        navigate({ to: "/result/$resultId", params: { resultId } });
      }, 500); // Brief delay for visual feedback
    }
  }, [isComplete, resultId, jobId, navigate]);

  // Handle failure from polling
  useEffect(() => {
    if (isFailed) {
      setError({
        message: polledErrorMessage || "Processing failed. Please try again.",
        code: "PROCESSING_FAILED",
        canRetry: true,
      });
      setState("error");
      // Story 5.7: Update session status
      updateJobStatus(jobId, "failed");
    }
  }, [isFailed, polledErrorMessage, jobId]);

  const startProcessing = useCallback(async () => {
    // Check if we have a session for this job
    if (!hasSession(jobId)) {
      setError({
        message: "Session not found. Please start a new upload.",
        code: "SESSION_NOT_FOUND",
        canRetry: false,
      });
      setState("error");
      return;
    }

    const sessionToken = getSession(jobId);
    if (!sessionToken) {
      setError({
        message: "Invalid session. Please start a new upload.",
        code: "INVALID_SESSION",
        canRetry: false,
      });
      setState("error");
      return;
    }

    setState("starting");

    try {
      const response = await fetch(`${API_BASE_URL}/api/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
        body: JSON.stringify({
          uploadId: jobId,
          // Include promptVersion when provided via URL
          ...(urlPromptVersion && { promptVersion: urlPromptVersion }),
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        // Already processing - that's fine, just poll for status
        setState("already-processing");
        if (data.workflowRunId) {
          setWorkflowRunId(data.workflowRunId);
        }
        return;
      }

      if (!response.ok) {
        // Handle timeout specifically (AC-2, AC-3)
        if (response.status === 408 || data.code === "PROCESSING_TIMEOUT") {
          if (isPostHogConfigured()) {
            posthog.capture("processing_timeout_shown", {
              upload_id: jobId,
              last_stage: data.lastStage,
              last_progress: data.lastProgress,
            });
          }
          setError({
            message: "This is taking longer than expected. Let's try again!",
            code: "PROCESSING_TIMEOUT",
            canRetry: true,
            lastStage: data.lastStage,
            lastProgress: data.lastProgress,
          });
          setState("timeout");
          return;
        }

        // Handle different error codes
        const errorMessage = getErrorMessage(response.status, data);
        setError({
          message: errorMessage,
          code: data.code,
          canRetry: data.canRetry ?? (response.status >= 500 || response.status === 0),
        });
        setState("error");
        return;
      }

      // Success - processing started, now poll for status
      setState("processing");
      setWorkflowRunId(data.workflowRunId);
      // Story 5.7: Update session status
      updateJobStatus(jobId, "processing");
    } catch (err) {
      console.error("[processing] Error starting process:", err);
      setError({
        message: "Something went wrong. Please try again.",
        code: "NETWORK_ERROR",
        canRetry: true,
      });
      setState("error");
    }
  }, [jobId, selectedPrompt]);

  // Start processing on mount (auto-start in prod, manual in dev for testing)
  const [devManualStart, setDevManualStart] = useState(false);
  useEffect(() => {
    // When prompt selector is enabled WITHOUT a pre-selected prompt, wait for manual start
    // If promptVersion is in URL, auto-start with that prompt
    if (showPromptSelector && !urlPromptVersion && !devManualStart) return;

    if (state === "idle") {
      startProcessing();
    }
  }, [state, startProcessing, devManualStart, showPromptSelector, urlPromptVersion]);

  // Handle retry by calling the retry endpoint first, then restarting processing
  const handleRetry = async () => {
    const sessionToken = getSession(jobId);
    if (!sessionToken) {
      setError({
        message: "Session expired. Please start a new upload.",
        code: "SESSION_EXPIRED",
        canRetry: false,
      });
      setState("error");
      return;
    }

    setState("retrying");

    try {
      // Track retry attempt
      if (isPostHogConfigured()) {
        posthog.capture("processing_retry_started", {
          upload_id: jobId,
        });
      }

      // First, reset the job state via retry endpoint
      const retryResponse = await fetch(`${API_BASE_URL}/api/retry/${jobId}`, {
        method: "POST",
        headers: {
          "X-Session-Token": sessionToken,
        },
      });

      if (!retryResponse.ok) {
        const data = await retryResponse.json();
        throw new Error(data.error || "Failed to reset job for retry");
      }

      // Then restart processing
      setError(null);
      setState("idle");
    } catch (err) {
      console.error("[processing] Error during retry:", err);
      if (isPostHogConfigured()) {
        posthog.capture("processing_retry_failed", {
          upload_id: jobId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      setError({
        message: "Couldn't start retry. Please try again.",
        code: "RETRY_FAILED",
        canRetry: true,
      });
      setState("error");
    }
  };

  const handleStartOver = () => {
    navigate({ to: "/" });
  };

  // Show prompt selector when ?prompts=true is in URL
  if (showPromptSelector && state === "idle" && !devManualStart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-cream">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="font-display text-2xl text-charcoal">Dev Mode: Select Prompt</h1>
          <p className="text-warm-gray">
            Choose which prompt version to test before starting processing.
          </p>

          <div className="space-y-3">
            {PROMPT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedPrompt === option.value
                    ? "border-coral bg-coral/10"
                    : "border-warm-gray/30 hover:border-coral/50"
                }`}
              >
                <input
                  type="radio"
                  name="promptVersion"
                  value={option.value}
                  checked={selectedPrompt === option.value}
                  onChange={(e) => setSelectedPrompt(e.target.value as PromptVersion)}
                  className="sr-only"
                />
                <div
                  className={`size-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPrompt === option.value ? "border-coral" : "border-warm-gray/50"
                  }`}
                >
                  {selectedPrompt === option.value && (
                    <div className="size-3 rounded-full bg-coral" />
                  )}
                </div>
                <span className="text-left text-sm font-medium text-charcoal">{option.label}</span>
              </label>
            ))}
          </div>

          <button
            onClick={() => setDevManualStart(true)}
            className="w-full px-6 py-3 bg-coral text-white font-body rounded-lg hover:bg-coral/90 transition-colors"
          >
            Start Processing with {selectedPrompt}
          </button>

          <p className="text-xs text-warm-gray/70">Job ID: {jobId}</p>
        </div>
      </div>
    );
  }

  // Processing states use full-screen ProcessingScreen component
  if (
    state === "idle" ||
    state === "starting" ||
    state === "processing" ||
    state === "already-processing"
  ) {
    return (
      <>
        <ProcessingScreen
          stage={stage}
          progress={state === "idle" || state === "starting" ? 0 : progress}
          isComplete={isComplete}
          isFailed={isFailed}
        />
        {/* Debug panel at bottom (when prompt selector enabled) */}
        {showPromptSelector && (
          <div className="fixed bottom-0 left-0 right-0 bg-charcoal/90 text-white p-2 text-xs font-mono z-50">
            <div className="flex gap-4 justify-center flex-wrap">
              <span>Job: {jobId}</span>
              <span>State: {state}</span>
              <span>Stage: {stage || "none"}</span>
              <span>Progress: {progress}%</span>
              <span className="text-coral">Prompt: {selectedPrompt}</span>
              {workflowRunId && <span>Run: {workflowRunId.slice(0, 8)}</span>}
            </div>
          </div>
        )}
      </>
    );
  }

  // Non-processing states (complete, retrying, timeout, error)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-cream">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Complete state */}
        {state === "complete" && (
          <>
            <div className="space-y-4">
              <h1 className="font-display text-2xl text-charcoal">Your portrait is ready!</h1>
              {resultUrl ? (
                <div className="rounded-xl overflow-hidden shadow-lg border-4 border-white">
                  <img src={resultUrl} alt="Your AI-generated portrait" className="w-full h-auto" />
                </div>
              ) : (
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
              )}
              {/* Show prompt version badge */}
              {promptVersion && (
                <div className="flex justify-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-charcoal/10 text-charcoal">
                    Prompt:{" "}
                    {promptVersion === "v4"
                      ? "National Geographic Style"
                      : promptVersion === "v3"
                        ? "Close-up Style"
                        : promptVersion}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleStartOver}
                className="px-6 py-3 bg-coral text-white font-body rounded-lg hover:bg-coral/90 transition-colors"
              >
                Create Another Portrait
              </button>
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
              <p className="font-body text-warm-gray">Hang tight, we're setting things up.</p>
            </div>
          </>
        )}

        {/* Timeout state (AC-2, AC-3) */}
        {state === "timeout" && error && (
          <>
            <div className="flex justify-center">
              <div className="size-20 text-6xl flex items-center justify-center">:(</div>
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
              <h1 className="font-display text-2xl text-charcoal">Oops! Something went wrong</h1>
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

        {/* Debug info (when prompt selector enabled) */}
        {showPromptSelector && (
          <div className="text-xs text-warm-gray/50 font-mono space-y-1 pt-4 border-t border-warm-gray/20">
            <p>Job ID: {jobId}</p>
            <p>State: {state}</p>
            <p>Prompt: {selectedPrompt}</p>
            {workflowRunId && <p>Workflow Run: {workflowRunId}</p>}
            {error?.code && <p>Error Code: {error.code}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get a user-friendly error message based on status code and response data
 */
function getErrorMessage(status: number, data: Record<string, unknown>): string {
  switch (status) {
    case 401:
      return "Your session has expired. Please start a new upload.";
    case 404:
      return "We couldn't find your upload. Please try again.";
    case 409:
      return "Your image is already being processed.";
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 500:
    case 502:
    case 503:
      return "Our servers are having trouble. Please try again in a moment.";
    default:
      return (data.error as string) || "Something went wrong. Please try again.";
  }
}
