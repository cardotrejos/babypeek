import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { posthog, isPostHogConfigured } from "@/lib/posthog"

/**
 * Checkout Success Page
 * Story 6.1: Stripe Checkout Integration (AC-7)
 *
 * Displayed after successful Stripe Checkout completion.
 * - Shows success message
 * - Displays download button (placeholder for Story 7.x)
 * - Tracks checkout_completed event
 */
export const Route = createFileRoute("/checkout-success")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: search.session_id as string | undefined,
  }),
  component: CheckoutSuccessPage,
})

function CheckoutSuccessPage() {
  const navigate = useNavigate()
  const { session_id } = Route.useSearch()

  // Track checkout completion
  useEffect(() => {
    if (session_id && isPostHogConfigured()) {
      posthog.capture("checkout_completed", {
        session_id,
      })
    }
  }, [session_id])

  const handleStartOver = useCallback(() => {
    navigate({ to: "/" })
  }, [navigate])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="size-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="size-10 text-green-600"
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

        {/* Success message */}
        <div className="space-y-2">
          <h1 className="font-display text-3xl text-charcoal">
            Payment Successful! 🎉
          </h1>
          <p className="font-body text-warm-gray text-lg">
            Thank you for your purchase. Your HD portrait is ready!
          </p>
        </div>

        {/* Download button - placeholder for Story 7.x */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full bg-coral hover:bg-coral/90 text-white font-body text-lg py-6"
            onClick={() => {
              // TODO: Implement actual download in Story 7.x
              // For now, show a message that download is coming
            }}
          >
            Download HD Portrait
          </Button>

          <p className="text-sm text-warm-gray">
            Download will be available shortly. Check back soon!
          </p>
        </div>

        {/* Secondary action */}
        <div className="pt-4">
          <Button variant="ghost" onClick={handleStartOver}>
            Create Another Portrait
          </Button>
        </div>
      </div>
    </div>
  )
}
