import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useState, useEffect, useCallback, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { getSession, getJobData } from "@/lib/session"
// Note: clearSession will be used in Epic 6 after payment completes (Story 5.7: AC7)
import { posthog, isPostHogConfigured } from "@/lib/posthog"
import { usePreloadImage } from "@/hooks/use-preload-image"
import { RevealAnimation, RevealUI, BeforeAfterSlider } from "@/components/reveal"
import { API_BASE_URL } from "@/lib/api-config"

/**
 * Result/Reveal Page
 * Story 5.3: Blur-to-Sharp Reveal Animation
 *
 * This route displays the dramatic reveal of the processed portrait.
 * Key features:
 * - AC-1 to AC-7: Complete reveal animation
 * - Image preloading during navigation
 * - Post-reveal UI with purchase/share/download options
 */
export const Route = createFileRoute("/result/$resultId")({
  component: ResultPage,
})

interface StatusData {
  success: boolean
  status: string
  stage: string
  progress: number
  resultId: string | null
  resultUrl: string | null
  originalUrl: string | null
  promptVersion: string | null
  errorMessage: string | null
  updatedAt: string
}

function ResultPage() {
  const { resultId } = Route.useParams()
  const navigate = useNavigate()

  const [showRevealUI, setShowRevealUI] = useState(false)
  const [revealStartTime, setRevealStartTime] = useState<number | null>(null)
  const [preloadStartTime, setPreloadStartTime] = useState<number | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  // Track if we came from session recovery
  const sessionRecoveryTrackedRef = useRef(false)

  // Get upload ID from local storage (resultId mapping stored during processing)
  // Safe localStorage access for SSR/private browsing
  const uploadId = (() => {
    try {
      return typeof window !== "undefined"
        ? localStorage.getItem(`3d-ultra-result-upload-${resultId}`)
        : null
    } catch {
      return null
    }
  })()
  const sessionToken = uploadId ? getSession(uploadId) : null

  // Story 5.7: Track if this was a session recovery navigation
  useEffect(() => {
    if (sessionRecoveryTrackedRef.current || !uploadId) return

    const jobData = getJobData(uploadId)
    if (jobData?.status === "completed" && jobData.resultId === resultId) {
      sessionRecoveryTrackedRef.current = true

      if (isPostHogConfigured()) {
        posthog.capture("session_recovery_result_viewed", {
          upload_id: uploadId,
          result_id: resultId,
        })
      }
    }
  }, [uploadId, resultId])

  // Fetch result data via status endpoint (uses uploadId, not resultId)
  const {
    data: statusData,
    isLoading,
    error,
  } = useQuery<StatusData>({
    queryKey: ["status", uploadId],
    queryFn: async () => {
      if (!uploadId || !sessionToken) {
        throw new Error("Session not found. Please start a new upload.")
      }

      const response = await fetch(`${API_BASE_URL}/api/status/${uploadId}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
      })

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Result not found"
            : response.status === 401
              ? "Session expired. Please start a new upload."
              : "Failed to load result"
        )
      }

      const data = await response.json()
      
      // Verify the result is complete and has a URL
      if (data.status !== "completed" || !data.resultUrl) {
        throw new Error("Portrait is not ready yet")
      }

      return data
    },
    enabled: !!uploadId && !!sessionToken,
    retry: 1,
    staleTime: Number.POSITIVE_INFINITY, // Result data doesn't change
  })

  // Extract preview URL from status data
  const previewUrl = statusData?.resultUrl ?? null

  // Preload the image (AC-6)
  const { isLoaded: imageLoaded, isLoading: imageLoading } = usePreloadImage(
    previewUrl
  )

  // Track preload start time when we have a URL
  useEffect(() => {
    if (previewUrl && !preloadStartTime) {
      setPreloadStartTime(Date.now())
    }
  }, [previewUrl, preloadStartTime])

  // Track reveal started when image is loaded (Task 7 analytics)
  useEffect(() => {
    if (imageLoaded && !revealStartTime) {
      const preloadTime = preloadStartTime ? Date.now() - preloadStartTime : 0
      setRevealStartTime(Date.now())

      if (isPostHogConfigured()) {
        posthog.capture("reveal_started", {
          result_id: resultId,
          upload_id: uploadId,
          reveal_preload_time_ms: preloadTime,
        })
      }
    }
  }, [imageLoaded, revealStartTime, resultId, uploadId, preloadStartTime])

  // Handle reveal completion (AC-4)
  const handleRevealComplete = useCallback(() => {
    setShowRevealUI(true)

    // Track reveal completion with duration
    if (isPostHogConfigured() && revealStartTime) {
      const duration = Date.now() - revealStartTime
      posthog.capture("reveal_completed", {
        result_id: resultId,
        upload_id: uploadId,
        reveal_duration_ms: duration,
      })
    }
  }, [resultId, uploadId, revealStartTime])

  // Note: Purchase is now handled directly by CheckoutButton in RevealUI (Story 6.1)
  // Story 5.7: After successful payment, clear the session (AC7)
  // clearSession(uploadId) should be called after payment completes in Epic 6

  const handleShare = useCallback(() => {
    if (isPostHogConfigured()) {
      posthog.capture("share_clicked", {
        result_id: resultId,
        source: "reveal_ui",
      })
    }
    // TODO: Implement share functionality when Epic 8 is implemented
    console.log("[result] Share clicked for result:", resultId)
  }, [resultId])


  const handleStartOver = useCallback(() => {
    navigate({ to: "/" })
  }, [navigate])

  // Toggle comparison slider (Story 5.5)
  const handleToggleComparison = useCallback(() => {
    const newState = !showComparison
    setShowComparison(newState)

    if (isPostHogConfigured()) {
      posthog.capture(newState ? "comparison_opened" : "comparison_closed", {
        result_id: resultId,
        source: "reveal_ui",
      })
    }
  }, [showComparison, resultId])

  // Loading state
  if (isLoading || imageLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="size-12 animate-spin rounded-full border-4 border-coral border-t-transparent mx-auto" />
          <p className="font-body text-warm-gray">
            {isLoading ? "Loading your portrait..." : "Preparing the reveal..."}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !previewUrl) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
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
              Couldn&apos;t load your portrait
            </h1>
            <p className="font-body text-warm-gray">
              {error instanceof Error
                ? error.message
                : "Something went wrong. Please try again."}
            </p>
          </div>
          <button
            onClick={handleStartOver}
            className="px-6 py-3 bg-coral text-white font-body rounded-lg hover:bg-coral/90 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    )
  }

  // Extract original URL for comparison slider
  const originalUrl = statusData?.originalUrl ?? null

  // Reveal animation (AC-1 to AC-7) or Comparison slider (Story 5.5)
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      {showComparison && originalUrl ? (
        // Comparison slider view (Story 5.5)
        <div className="relative w-full max-w-md mx-auto space-y-4">
          <BeforeAfterSlider
            beforeImage={originalUrl}
            afterImage={previewUrl}
            beforeLabel="Your Ultrasound"
            afterLabel="AI Portrait"
          />
          <RevealUI
            resultId={resultId}
            uploadId={uploadId!}
            previewUrl={previewUrl}
            onShare={handleShare}
            hasOriginalImage={!!originalUrl}
            showComparison={showComparison}
            onToggleComparison={handleToggleComparison}
          />
        </div>
      ) : (
        // Reveal animation view
        <RevealAnimation
          imageUrl={previewUrl}
          alt="Your AI-generated baby portrait"
          onRevealComplete={handleRevealComplete}
          showUI={showRevealUI}
        >
          <RevealUI
            resultId={resultId}
            uploadId={uploadId!}
            previewUrl={previewUrl}
            onShare={handleShare}
            hasOriginalImage={!!originalUrl}
            showComparison={showComparison}
            onToggleComparison={handleToggleComparison}
          />
        </RevealAnimation>
      )}
    </div>
  )
}
