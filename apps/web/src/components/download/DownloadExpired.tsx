import { useNavigate } from "@tanstack/react-router"

/**
 * DownloadExpired Component
 * Story 7.5 AC-3: Show warm message about expiry
 *
 * Displays when download has expired (>30 days after purchase).
 * Provides:
 * - Clear expiry message
 * - "Create New Portrait" CTA
 * - Support contact link
 */

interface DownloadExpiredProps {
  expiresAt: string | null
}

export function DownloadExpired({ expiresAt }: DownloadExpiredProps) {
  const navigate = useNavigate()

  const expiredDate = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="size-20 rounded-full bg-amber-100 flex items-center justify-center">
            <span className="text-4xl">⏰</span>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="font-display text-2xl text-charcoal">
            Download Expired
          </h1>
          <p className="text-warm-gray">
            {expiredDate
              ? `Your download access expired on ${expiredDate}. Downloads are available for 30 days after purchase.`
              : "Your download access has expired. Downloads are available for 30 days after purchase."}
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="w-full px-6 py-3 bg-coral text-white font-body rounded-lg hover:bg-coral/90 transition-colors"
          >
            Create New Portrait
          </button>

          <p className="text-sm text-warm-gray">
            Need help?{" "}
            <a
              href="mailto:support@3d-ultra.com"
              className="text-coral underline hover:no-underline"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
