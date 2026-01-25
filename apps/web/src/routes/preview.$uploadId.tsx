import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { posthog, isPostHogConfigured } from "@/lib/posthog";
import { trackFBEvent } from "@/lib/facebook-pixel";
import {
  RevealUI,
  BeforeAfterSlider,
  ResultsGallery,
  type ResultVariant,
} from "@/components/reveal";
import { API_BASE_URL } from "@/lib/api-config";
import { getPaymentErrorMessage } from "@/lib/payment-errors";
import { ExpiredResult } from "@/components/states";

/**
 * Public Preview Page
 *
 * This page is accessible without a session token, designed for email links.
 * Shows all 4 watermarked portrait variants with purchase option.
 *
 * Key differences from /result/:resultId:
 * - No session token required (public access via uploadId)
 * - Uses /api/preview/:uploadId endpoint
 * - Same UI/UX as result page
 */

// Search params for payment failure handling
interface PreviewSearchParams {
  cancelled?: string;
  error?: string;
}

export const Route = createFileRoute("/preview/$uploadId")({
  component: PreviewPage,
  validateSearch: (search: Record<string, unknown>): PreviewSearchParams => ({
    cancelled: search.cancelled === "true" ? "true" : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
});

interface PreviewData {
  success: boolean;
  uploadId: string;
  status: string;
  originalUrl: string | null;
  results: ResultVariant[];
  hasPurchased: boolean;
}

function PreviewPage() {
  const { uploadId } = Route.useParams();
  const { cancelled, error: paymentError } = Route.useSearch();
  const navigate = useNavigate();

  const [showComparison, setShowComparison] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  // Track if we already showed payment error/cancel toast
  const paymentErrorTrackedRef = useRef(false);
  const analyticsTrackedRef = useRef(false);

  // Handle payment cancellation/error from Stripe redirect
  useEffect(() => {
    if (paymentErrorTrackedRef.current) return;
    if (!cancelled && !paymentError) return;

    paymentErrorTrackedRef.current = true;

    if (cancelled === "true") {
      toast.info("No worries! Your photo is still here when you're ready.");

      if (isPostHogConfigured()) {
        posthog.capture("checkout_cancelled", {
          upload_id: uploadId,
          source: "preview_page",
        });
      }
    } else if (paymentError) {
      const message = getPaymentErrorMessage(paymentError);
      toast.error(message);

      if (isPostHogConfigured()) {
        posthog.capture("payment_failed", {
          upload_id: uploadId,
          error_type: paymentError,
          retry_count: retryCount,
          source: "preview_page",
        });
      }
    }

    // Clear query params from URL to prevent re-triggering
    window.history.replaceState({}, "", `/preview/${uploadId}`);
  }, [cancelled, paymentError, uploadId, retryCount]);

  // Fetch preview data via public endpoint (no auth required)
  const {
    data: previewData,
    isLoading,
    error: queryError,
  } = useQuery<PreviewData>({
    queryKey: ["preview", uploadId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/preview/${uploadId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Portrait not found");
        }
        if (response.status === 202) {
          const data = await response.json();
          throw new Error(`Portrait is still processing (${data.progress}%)`);
        }
        throw new Error("Failed to load portrait");
      }

      return response.json();
    },
    retry: 1,
    staleTime: 60 * 1000, // 1 minute
  });

  // Track page view
  useEffect(() => {
    if (!previewData || analyticsTrackedRef.current) return;
    analyticsTrackedRef.current = true;

    if (isPostHogConfigured()) {
      posthog.capture("preview_page_viewed", {
        upload_id: uploadId,
        has_purchased: previewData.hasPurchased,
        variant_count: previewData.results.length,
      });
    }

    // Facebook Pixel: ViewContent event
    trackFBEvent("ViewContent", {
      content_name: "Baby Portrait Preview (Email Link)",
      content_category: "AI Portrait",
      content_type: "product",
      value: 9.99,
      currency: "USD",
      upload_id: uploadId,
    });
  }, [previewData, uploadId]);

  // Get selected result
  const allResults = previewData?.results ?? [];
  const selectedResult = allResults[selectedVariantIndex] ?? null;
  const hasPurchased = previewData?.hasPurchased ?? false;

  // Use preview URL (watermarked) unless purchased
  const previewUrl = hasPurchased
    ? (selectedResult?.resultUrl ?? selectedResult?.previewUrl ?? null)
    : (selectedResult?.previewUrl ?? null);

  const handleShare = useCallback(() => {
    if (isPostHogConfigured()) {
      posthog.capture("share_clicked", {
        upload_id: uploadId,
        source: "preview_page",
      });
    }
    // TODO: Implement share functionality
  }, [uploadId]);

  const handleStartOver = useCallback(() => {
    navigate({ to: "/" });
  }, [navigate]);

  // Toggle comparison slider
  const handleToggleComparison = useCallback(() => {
    const newState = !showComparison;
    setShowComparison(newState);

    if (isPostHogConfigured()) {
      posthog.capture(newState ? "comparison_opened" : "comparison_closed", {
        upload_id: uploadId,
        source: "preview_page",
      });
    }
  }, [showComparison, uploadId]);

  // Track retry attempts
  const handleCheckoutStart = useCallback(() => {
    setRetryCount((prev) => {
      const newCount = prev + 1;

      if (prev > 0 && isPostHogConfigured()) {
        posthog.capture("payment_retry_attempted", {
          upload_id: uploadId,
          retry_count: newCount,
          source: "preview_page",
        });
      }

      return newCount;
    });
  }, [uploadId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-start p-4 pt-8">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="text-center">
            <h1 className="font-display text-2xl text-charcoal mb-2">Your Baby Portraits</h1>
            <p className="text-sm text-warm-gray">Loading your portraits...</p>
          </div>
          <ResultsGallery results={[]} selectedIndex={0} onSelect={() => {}} hasPurchased={false} />
        </div>
      </div>
    );
  }

  // Error state
  if (queryError) {
    // Check if it's a not found error (expired or invalid)
    const isNotFound =
      queryError instanceof Error &&
      (queryError.message.includes("not found") ||
        queryError.message.includes("Portrait not found"));

    if (isNotFound) {
      return <ExpiredResult resultId={uploadId} source="preview" />;
    }

    // Query error state
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
              {queryError instanceof Error
                ? queryError.message
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
    );
  }

  // No preview URL available (results empty or preview not generated)
  if (!previewUrl) {
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
            <p className="font-body text-warm-gray">Portrait is not ready yet</p>
          </div>
          <button
            onClick={handleStartOver}
            className="px-6 py-3 bg-coral text-white font-body rounded-lg hover:bg-coral/90 transition-colors"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  const originalUrl = previewData?.originalUrl ?? null;
  const currentResultId = selectedResult?.resultId ?? uploadId;

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-start p-4 pt-8">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-2xl text-charcoal mb-2">Your Baby Portraits</h1>
          <p className="text-sm text-warm-gray">Tap to select your favorite style</p>
        </div>

        {/* Comparison slider view */}
        {showComparison && originalUrl ? (
          <BeforeAfterSlider
            beforeImage={originalUrl}
            afterImage={previewUrl}
            beforeLabel="Your Ultrasound"
            afterLabel="AI Portrait"
            allowImageSave={hasPurchased}
          />
        ) : (
          /* Gallery - show all 4 images */
          <ResultsGallery
            results={allResults}
            selectedIndex={selectedVariantIndex}
            onSelect={(index) => {
              setSelectedVariantIndex(index);
            }}
            uploadId={uploadId}
            hasPurchased={hasPurchased}
          />
        )}

        {/* Action buttons */}
        <RevealUI
          resultId={currentResultId}
          uploadId={uploadId}
          previewUrl={previewUrl}
          onShare={handleShare}
          hasOriginalImage={!!originalUrl}
          showComparison={showComparison}
          onToggleComparison={handleToggleComparison}
          retryCount={retryCount}
          onCheckoutStart={handleCheckoutStart}
          onStartOver={handleStartOver}
          hasPurchasedProp={hasPurchased}
        />
      </div>
    </div>
  );
}
