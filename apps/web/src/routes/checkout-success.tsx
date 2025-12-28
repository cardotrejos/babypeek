import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/download";
import { posthog, isPostHogConfigured } from "@/lib/posthog";
import { getSession } from "@/lib/session";
import { toast } from "sonner";

/**
 * Checkout Success Page
 * Story 6.1: Stripe Checkout Integration (AC-7)
 * Story 7.3: In-App Download Button (AC-1, AC-4)
 *
 * Displayed after successful Stripe Checkout completion.
 * - Shows success message
 * - Displays download button with HD image download
 * - Tracks checkout_completed event
 */
export const Route = createFileRoute("/checkout-success")({
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: search.session_id as string | undefined,
  }),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const navigate = useNavigate();
  const { session_id } = Route.useSearch();
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Get uploadId from localStorage (stored during checkout in Story 7.3)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedUploadId = localStorage.getItem("babypeek-last-checkout-upload");
      if (storedUploadId) {
        setUploadId(storedUploadId);
        const token = getSession(storedUploadId);
        setSessionToken(token);
      }
    } catch {
      // localStorage may not be available (SSR, private browsing)
    }
  }, []);

  // Track checkout completion
  useEffect(() => {
    if (session_id && isPostHogConfigured()) {
      posthog.capture("checkout_completed", {
        session_id,
        upload_id: uploadId,
      });
    }
  }, [session_id, uploadId]);

  const handleStartOver = useCallback(() => {
    navigate({ to: "/" });
  }, [navigate]);

  // AC-4: Success callback shows toast and cleans up localStorage
  const handleDownloadSuccess = useCallback(() => {
    toast.success("Your HD photo has been downloaded!");
    // Clean up localStorage after successful download
    try {
      localStorage.removeItem("babypeek-last-checkout-upload");
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Handle download errors gracefully
  const handleDownloadError = useCallback((error: string) => {
    toast.error(error || "Download failed. Please try again.");
  }, []);

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
          <h1 className="font-display text-3xl text-charcoal">Payment Successful! 🎉</h1>
          <p className="font-body text-warm-gray text-lg">
            Thank you for your purchase. Your HD portrait is ready!
          </p>
        </div>

        {/* Download button - Story 7.3 AC-1 */}
        <div className="space-y-3">
          {uploadId && sessionToken ? (
            <DownloadButton
              uploadId={uploadId}
              sessionToken={sessionToken}
              onSuccess={handleDownloadSuccess}
              onError={handleDownloadError}
            />
          ) : (
            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full bg-coral hover:bg-coral/90 text-white font-body text-lg py-6"
                disabled
              >
                Download HD Portrait
              </Button>
              <p className="text-warm-gray text-sm">
                Download link will be sent to your email shortly.
              </p>
            </div>
          )}

          <p className="text-sm text-warm-gray">
            You can also download from the email we sent you.
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
  );
}
