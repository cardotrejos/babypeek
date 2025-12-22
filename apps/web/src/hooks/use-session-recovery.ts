import { useEffect, useState, useCallback, useRef } from "react"
import { useNavigate, useLocation } from "@tanstack/react-router"
import {
  getPendingJob,
  getCompletedJobNeedingRedirect,
  clearStaleSessions,
  clearSession,
  updateJobResult,
  updateJobStatus,
  type JobData,
} from "@/lib/session"
import { posthog, isPostHogConfigured } from "@/lib/posthog"
import { useVisibilityChange } from "@/hooks/use-visibility-change"
import { API_BASE_URL } from "@/lib/api-config"

/**
 * Hook for session recovery on app initialization (Story 5.7: AC5, AC6)
 *
 * Handles:
 * - Clearing stale sessions (>24h old)
 * - Detecting incomplete jobs on app load
 * - Offering to resume or redirecting as appropriate
 *
 * @returns Session recovery state and actions
 */
export function useSessionRecovery() {
  const navigate = useNavigate()
  const location = useLocation()
  const [pendingJob, setPendingJob] = useState<JobData | null>(null)
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const dismissedRef = useRef(false)
  const inFlightRef = useRef(false)

  const checkRecovery = useCallback(async () => {
    // Prevent overlapping checks (route change + visibility)
    if (inFlightRef.current) return
    inFlightRef.current = true
    setIsChecking(true)

    try {
      // SSR safety
      if (typeof window === "undefined") {
        setIsChecking(false)
        return
      }

      // Clear stale sessions first (Story 5.7: AC7)
      clearStaleSessions()

      // Skip recovery check if already on processing or result pages
      const path = location.pathname
      if (path.startsWith("/processing/") || path.startsWith("/result/")) {
        setIsChecking(false)
        return
      }

      // 1) If we already have a completed job with stored resultId, redirect immediately (AC6)
      const completedJob = getCompletedJobNeedingRedirect()
      if (completedJob?.resultId) {
        if (isPostHogConfigured()) {
          posthog.capture("session_recovery_redirect", {
            job_id: completedJob.jobId,
            result_id: completedJob.resultId,
            recovery_type: "completed_cached",
          })
        }

        navigate({
          to: "/result/$resultId",
          params: { resultId: completedJob.resultId },
        })
        setIsChecking(false)
        return
      }

      // 2) If there's a pending job, do a one-shot status check on return (AC5, AC6)
      const pending = getPendingJob()
      if (pending && (pending.status === "pending" || pending.status === "processing")) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/status/${pending.jobId}`, {
            headers: {
              "Content-Type": "application/json",
              "X-Session-Token": pending.token,
            },
          })

          if (response.ok) {
            const data = (await response.json()) as {
              status: string
              resultId: string | null
              errorMessage: string | null
            }

            if (data.status === "completed" && data.resultId) {
              // Persist resultId for future recovery + redirect (AC6)
              updateJobResult(pending.jobId, data.resultId)
              localStorage.setItem(`babypeek-result-upload-${data.resultId}`, pending.jobId)

              if (isPostHogConfigured()) {
                posthog.capture("session_recovery_redirect", {
                  job_id: pending.jobId,
                  result_id: data.resultId,
                  recovery_type: "completed_refetch",
                })
              }

              navigate({
                to: "/result/$resultId",
                params: { resultId: data.resultId },
              })
              setIsChecking(false)
              return
            }

            if (data.status === "failed") {
              updateJobStatus(pending.jobId, "failed")
            }
          }
        } catch {
          // Ignore network errors; user can resume manually
        }

        // Don't nag again if user dismissed (but still allow completed redirects above)
        if (!dismissedRef.current) {
          setPendingJob(pending)
          setShowRecoveryPrompt(true)

          if (isPostHogConfigured()) {
            posthog.capture("session_recovery_prompt_shown", {
              job_id: pending.jobId,
              job_status: pending.status,
            })
          }
        }
      }

      setIsChecking(false)
    } finally {
      inFlightRef.current = false
    }
  }, [navigate, location.pathname])

  // Run on mount + route changes (AC5)
  useEffect(() => {
    void checkRecovery()
  }, [checkRecovery])

  // Also run when the app becomes visible again (AC6)
  useVisibilityChange(
    useCallback(() => {
      void checkRecovery()
    }, [checkRecovery]),
    { enabled: true }
  )

  // Resume the pending job
  const resumeJob = useCallback(() => {
    if (!pendingJob) return

    // Track resume action
    if (isPostHogConfigured()) {
      posthog.capture("session_recovery_resumed", {
        job_id: pendingJob.jobId,
        job_status: pendingJob.status,
      })
    }

    // Navigate to processing page
    navigate({
      to: "/processing/$jobId",
      params: { jobId: pendingJob.jobId },
    })

    setShowRecoveryPrompt(false)
    setPendingJob(null)
  }, [pendingJob, navigate])

  // Start fresh (clear pending job)
  const startFresh = useCallback(() => {
    if (!pendingJob) return

    // Track dismiss action
    if (isPostHogConfigured()) {
      posthog.capture("session_recovery_dismissed", {
        job_id: pendingJob.jobId,
        job_status: pendingJob.status,
      })
    }

    // Clear the session
    clearSession(pendingJob.jobId)

    setShowRecoveryPrompt(false)
    setPendingJob(null)
  }, [pendingJob])

  // Dismiss the prompt without clearing (user might want to come back)
  const dismissPrompt = useCallback(() => {
    dismissedRef.current = true
    setShowRecoveryPrompt(false)
  }, [])

  return {
    pendingJob,
    showRecoveryPrompt,
    isChecking,
    resumeJob,
    startFresh,
    dismissPrompt,
  }
}
