import { useSessionRecovery } from "@/hooks/use-session-recovery"

/**
 * Session Recovery Prompt Component (Story 5.7)
 *
 * Shows a prompt when user returns to app with an incomplete job.
 * Offers to resume processing or start fresh.
 */
export function SessionRecoveryPrompt() {
  const { pendingJob, showRecoveryPrompt, resumeJob, startFresh, dismissPrompt } =
    useSessionRecovery()

  if (!showRecoveryPrompt || !pendingJob) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="size-16 rounded-full bg-coral/10 flex items-center justify-center">
            <svg
              className="size-8 text-coral"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-2">
          <h2
            id="recovery-title"
            className="font-display text-xl text-charcoal"
          >
            Welcome back!
          </h2>
          <p className="font-body text-warm-gray text-sm">
            {pendingJob.status === "processing"
              ? "Your portrait is still being created. Would you like to check on it?"
              : "You have an unfinished upload. Would you like to continue?"}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={resumeJob}
            className="w-full px-4 py-3 bg-coral text-white font-body rounded-xl hover:bg-coral/90 transition-colors"
          >
            {pendingJob.status === "processing" ? "Check Progress" : "Continue"}
          </button>
          <button
            onClick={startFresh}
            className="w-full px-4 py-3 bg-charcoal/10 text-charcoal font-body rounded-xl hover:bg-charcoal/20 transition-colors"
          >
            Start Fresh
          </button>
          <button
            onClick={dismissPrompt}
            className="w-full px-4 py-2 text-warm-gray font-body text-sm hover:text-charcoal transition-colors"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  )
}
