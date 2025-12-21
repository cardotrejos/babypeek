import { Button } from "@/components/ui/button"
import { DownloadPreviewButton } from "./DownloadPreviewButton"

interface RevealUIProps {
  /** Result ID for analytics tracking */
  resultId: string
  /** Preview image URL for download */
  previewUrl: string
  onPurchase: () => void
  onShare: () => void
  /** Whether original image is available for comparison */
  hasOriginalImage?: boolean
  /** Whether comparison mode is active */
  showComparison?: boolean
  /** Toggle comparison mode */
  onToggleComparison?: () => void
}

/**
 * RevealUI Component
 * Story 5.3: Post-reveal UI overlay (AC-4)
 * Story 5.5: Before/After Comparison Toggle (AC-1)
 * Story 5.6: Download Preview Button (AC-1, AC-2, AC-3)
 *
 * Appears after the 3.5s reveal animation delay.
 * Provides:
 * - Primary CTA: Get HD Version ($9.99)
 * - Share button (preview)
 * - Download Preview button with proper download logic
 * - Compare button (toggles before/after slider)
 */
export function RevealUI({
  resultId,
  previewUrl,
  onPurchase,
  onShare,
  hasOriginalImage = false,
  showComparison = false,
  onToggleComparison,
}: RevealUIProps) {
  return (
    <div
      data-testid="reveal-ui-container"
      className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl space-y-4"
    >
      {/* Primary CTA */}
      <Button
        size="lg"
        className="w-full bg-coral hover:bg-coral/90 text-white font-body text-lg py-6"
        onClick={onPurchase}
      >
        Get HD Version - $9.99
      </Button>

      {/* Secondary actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onShare}>
          Share
        </Button>
        <DownloadPreviewButton
          previewUrl={previewUrl}
          resultId={resultId}
          variant="ghost"
          className="flex-1"
        />
      </div>

      {/* Compare toggle (Story 5.5 AC-1) */}
      {hasOriginalImage && onToggleComparison && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onToggleComparison}
          data-testid="compare-toggle"
        >
          {showComparison ? "Hide Comparison" : "Compare with Original"}
        </Button>
      )}
    </div>
  )
}
