import { useState } from "react"
import { cn } from "@/lib/utils"
import { posthog, isPostHogConfigured } from "@/lib/posthog"
import { API_BASE_URL } from "@/lib/api-config"
import { getSession } from "@/lib/session"

/**
 * Preference reason options with user-friendly labels
 */
const PREFERENCE_REASONS = [
  { value: "more_realistic", label: "More realistic" },
  { value: "better_lighting", label: "Better lighting" },
  { value: "cuter_expression", label: "Cuter expression" },
  { value: "clearer_details", label: "Clearer details" },
  { value: "better_colors", label: "Better colors" },
  { value: "more_natural", label: "More natural" },
] as const

type PreferenceReason = (typeof PREFERENCE_REASONS)[number]["value"]

interface PreferenceFeedbackProps {
  /** Upload ID for the current session */
  uploadId: string
  /** Selected result ID */
  selectedResultId: string
  /** Prompt version of selected result */
  promptVersion: string
  /** Callback when feedback is submitted */
  onSubmit?: () => void
  /** Additional class names */
  className?: string
}

/**
 * PreferenceFeedback Component
 *
 * Asks users why they preferred a specific result variant.
 * Displayed after user selects their favorite from the gallery.
 *
 * Features:
 * - Quick-select reason buttons
 * - Single selection
 * - Submits to /api/preferences
 * - Tracks analytics
 */
export function PreferenceFeedback({
  uploadId,
  selectedResultId,
  promptVersion,
  onSubmit,
  className,
}: PreferenceFeedbackProps) {
  const [selectedReason, setSelectedReason] = useState<PreferenceReason | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReasonSelect = async (reason: PreferenceReason) => {
    if (isSubmitting || isSubmitted) return

    setSelectedReason(reason)
    setIsSubmitting(true)
    setError(null)

    try {
      const sessionToken = getSession(uploadId)
      
      const response = await fetch(`${API_BASE_URL}/api/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken && { "X-Session-Token": sessionToken }),
        },
        body: JSON.stringify({
          uploadId,
          selectedResultId,
          reason,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save preference")
      }

      setIsSubmitted(true)

      // Track analytics
      if (isPostHogConfigured()) {
        posthog.capture("preference_feedback_submitted", {
          upload_id: uploadId,
          result_id: selectedResultId,
          prompt_version: promptVersion,
          reason,
        })
      }

      onSubmit?.()
    } catch (err) {
      console.error("Failed to submit preference:", err)
      setError("Couldn't save your feedback. No worries!")
      setSelectedReason(null)
      
      // Still track the attempt
      if (isPostHogConfigured()) {
        posthog.capture("preference_feedback_error", {
          upload_id: uploadId,
          result_id: selectedResultId,
          reason,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Skip without selecting a reason
  const handleSkip = async () => {
    if (isSubmitting || isSubmitted) return

    setIsSubmitting(true)

    try {
      const sessionToken = getSession(uploadId)
      
      // Save preference without reason
      await fetch(`${API_BASE_URL}/api/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken && { "X-Session-Token": sessionToken }),
        },
        body: JSON.stringify({
          uploadId,
          selectedResultId,
          // No reason
        }),
      })

      setIsSubmitted(true)

      if (isPostHogConfigured()) {
        posthog.capture("preference_feedback_skipped", {
          upload_id: uploadId,
          result_id: selectedResultId,
          prompt_version: promptVersion,
        })
      }

      onSubmit?.()
    } catch {
      // Silent fail for skip
      setIsSubmitted(true)
      onSubmit?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Already submitted - show thank you
  if (isSubmitted) {
    return (
      <div className={cn("text-center py-3", className)}>
        <p className="text-sm text-warm-gray">Thanks for your feedback!</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm text-warm-gray text-center">
        What made you choose this one?
      </p>
      
      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {PREFERENCE_REASONS.map((reason) => (
          <button
            key={reason.value}
            onClick={() => handleReasonSelect(reason.value)}
            disabled={isSubmitting}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full transition-all",
              "border border-warm-gray/30",
              "hover:border-coral hover:text-coral",
              "focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              selectedReason === reason.value && "bg-coral text-white border-coral"
            )}
          >
            {reason.label}
          </button>
        ))}
      </div>

      <button
        onClick={handleSkip}
        disabled={isSubmitting}
        className="block mx-auto text-xs text-warm-gray/70 hover:text-warm-gray transition-colors"
      >
        Skip
      </button>
    </div>
  )
}
