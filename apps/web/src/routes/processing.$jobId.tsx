import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/processing/$jobId")({
  component: ProcessingPage,
})

/**
 * Processing Page - Placeholder for Story 5.1
 * 
 * This route displays the processing status while the AI transforms the ultrasound.
 * Full implementation will be done in Story 5.1 (Processing Status Page).
 */
function ProcessingPage() {
  const { jobId } = Route.useParams()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-cream">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Loading spinner */}
        <div className="flex justify-center">
          <div className="size-16 animate-spin rounded-full border-4 border-coral border-t-transparent" />
        </div>

        {/* Status message */}
        <div className="space-y-2">
          <h1 className="font-display text-2xl text-charcoal">
            Creating your portrait...
          </h1>
          <p className="font-body text-warm-gray">
            Our AI is working its magic. This usually takes about 60 seconds.
          </p>
        </div>

        {/* Job ID for debugging (hidden in production) */}
        {import.meta.env.DEV && (
          <p className="text-xs text-warm-gray/50 font-mono">
            Job ID: {jobId}
          </p>
        )}
      </div>
    </div>
  )
}
