import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckoutButton } from "@/components/payment";
import { DownloadButton } from "@/components/download";
import { ShareButtons } from "@/components/share";
import { DeleteDataButton } from "@/components/settings";
import { toast } from "sonner";
import { getSession } from "@/lib/session";
import { API_BASE_URL } from "@/lib/api-config";

interface RevealUIProps {
  /** Result ID for analytics tracking */
  resultId: string;
  /** Upload ID for checkout */
  uploadId: string;
  /** Preview image URL for download */
  previewUrl: string;
  onShare: () => void;
  /** Whether original image is available for comparison */
  hasOriginalImage?: boolean;
  /** Whether comparison mode is active */
  showComparison?: boolean;
  /** Toggle comparison mode */
  onToggleComparison?: () => void;
  /** Retry count for payment retry tracking (Story 6.6) */
  retryCount?: number;
  /** Callback when checkout starts (Story 6.6) */
  onCheckoutStart?: () => void;
  /** Callback to start over with a new upload */
  onStartOver?: () => void;
  /** Whether purchase has already been completed (passed from parent, e.g., preview page) */
  hasPurchasedProp?: boolean;
}

/**
 * RevealUI Component
 * Story 5.3: Post-reveal UI overlay (AC-4)
 * Story 5.5: Before/After Comparison Toggle (AC-1)
 * Story 5.6: Download Preview Button (AC-1, AC-2, AC-3)
 * Story 6.1: Stripe Checkout Integration (AC-3, AC-4)
 *
 * Appears after the 3.5s reveal animation delay.
 * Provides:
 * - Primary CTA: Get HD Version ($9.99) - CheckoutButton with Stripe integration
 * - Share button (preview)
 * - Download Preview button with proper download logic
 * - Compare button (toggles before/after slider)
 */
export function RevealUI({
  resultId,
  uploadId,
  previewUrl: _previewUrl,
  onShare,
  hasOriginalImage = false,
  showComparison = false,
  onToggleComparison,
  retryCount = 0,
  onCheckoutStart,
  onStartOver,
  hasPurchasedProp,
}: RevealUIProps) {
  const sessionToken = getSession(uploadId);

  // Story 7.5 AC-2: Check if user has already purchased
  // Skip the query if hasPurchasedProp is already provided (e.g., from preview page)
  const { data: downloadStatus, isLoading: checkingPurchase } = useQuery({
    queryKey: ["download-status", uploadId],
    queryFn: async () => {
      if (!sessionToken) return null;

      const response = await fetch(`${API_BASE_URL}/api/download/${uploadId}/status`, {
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
      });

      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!sessionToken && hasPurchasedProp === undefined,
    staleTime: 60 * 1000, // 1 minute
    retry: false,
  });

  // Use prop if provided, otherwise fall back to query result
  const hasPurchased = hasPurchasedProp ?? downloadStatus?.canDownload === true;

  const handleCheckoutError = useCallback((error: string) => {
    toast.error("Unable to start checkout", {
      description: error,
    });
  }, []);

  return (
    <div
      data-testid="reveal-ui-container"
      className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl space-y-4"
    >
      {/* Primary CTA - Story 7.5 AC-2: Show Download if purchased, otherwise Checkout */}
      {checkingPurchase && hasPurchasedProp === undefined ? (
        <Button
          disabled
          className="w-full bg-coral hover:bg-coral/90 text-white font-body text-lg py-6"
        >
          Loading...
        </Button>
      ) : hasPurchased && sessionToken ? (
        <DownloadButton
          uploadId={uploadId}
          sessionToken={sessionToken}
          resultId={resultId}
          className="w-full bg-coral hover:bg-coral/90 text-white font-body text-lg py-6"
        />
      ) : (
        <CheckoutButton
          uploadId={uploadId}
          retryCount={retryCount}
          onCheckoutStart={onCheckoutStart}
          onCheckoutError={handleCheckoutError}
          className="w-full bg-coral hover:bg-coral/90 text-white font-body text-lg py-6"
        />
      )}

      {/* Secondary actions - only show share for paid users */}
      {hasPurchased && (
        <>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onShare}>
              Share
            </Button>
          </div>

          {/* Share buttons section (Story 8.1) */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-sm text-warm-gray text-center mb-3">Share your portrait</p>
            <ShareButtons uploadId={uploadId} resultId={resultId} />
          </div>
        </>
      )}

      {/* Paywall comparison for unpaid users - no download, clear upgrade path */}
      {!hasPurchased && !checkingPurchase && (
        <div className="bg-gradient-to-b from-coral/5 to-transparent rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-warm-gray">Preview</p>
              <ul className="text-warm-gray/70 space-y-0.5 text-xs">
                <li>Low resolution</li>
                <li>Watermarked</li>
                <li>No download</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-coral">HD Version</p>
              <ul className="text-charcoal space-y-0.5 text-xs">
                <li>Full resolution</li>
                <li>No watermarks</li>
                <li>Instant download</li>
                <li>Print-ready</li>
              </ul>
            </div>
          </div>
        </div>
      )}

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

      {/* Start Over / Try Again button */}
      {onStartOver && (
        <Button variant="outline" className="w-full" onClick={onStartOver}>
          Try with a Different Photo
        </Button>
      )}

      {/* GDPR Data Deletion (Story 8.6 AC-1) */}
      {sessionToken && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-center">
            <DeleteDataButton uploadId={uploadId} sessionToken={sessionToken} />
          </div>
        </div>
      )}
    </div>
  );
}
