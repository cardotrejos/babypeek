import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { DownloadButton, DownloadExpired } from "@/components/download";
import { API_BASE_URL } from "@/lib/api-config";
import { posthog, isPostHogConfigured } from "@/lib/posthog";
import { useSession } from "@/lib/auth-client";

/**
 * Download Page Route
 * Story 7.5: Re-Download Support
 *
 * AC-1: Re-download link available within 30 days
 * AC-2: Download button shown after purchase
 * AC-3: Shows "Download expired" after 30 days
 * AC-4: Fresh 7-day signed URL generated each time
 * AC-5: Re-downloads tracked for analytics
 */

export const Route = createFileRoute("/download/$uploadId")({
  component: DownloadPage,
});

interface DownloadStatus {
  canDownload: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  daysRemaining: number | null;
  error?: {
    code: string;
    message?: string;
    expiredAt?: string;
  };
}

function DownloadPage() {
  const { uploadId } = Route.useParams();
  const navigate = useNavigate();
  const { data: authSession, isPending: isAuthLoading } = useSession();

  // Check download eligibility
  const { data, isLoading, error } = useQuery<DownloadStatus>({
    queryKey: ["download-status", uploadId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/download/${uploadId}/status`, {
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to check download status");
      }

      const result = await response.json();

      // AC-5: Track expiry view
      if (result.isExpired && isPostHogConfigured()) {
        posthog.capture("download_expired_viewed", {
          upload_id: uploadId,
        });
      }

      return result;
    },
    enabled: !isAuthLoading && Boolean(authSession?.user),
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });

  // Loading state
  if (isLoading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="size-12 animate-spin rounded-full border-4 border-coral border-t-transparent" />
      </div>
    );
  }

  // Unauthenticated state
  if (!authSession?.user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="max-w-md text-center space-y-4">
          <div className="flex justify-center">
            <div className="size-16 rounded-full bg-warm-gray/10 flex items-center justify-center">
              <span className="text-3xl">🔒</span>
            </div>
          </div>
          <h1 className="font-display text-2xl text-charcoal">Session Not Found</h1>
          <p className="text-warm-gray">
            Please access this download link from the device where you received the email, or click the
            magic link in your email to authenticate.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // AC-3: Expired state
  if (data?.isExpired) {
    return <DownloadExpired expiresAt={data.expiresAt || data.error?.expiredAt || null} />;
  }

  // Error state (no purchase, not found, etc.)
  if (error || !data?.canDownload) {
    const errorMessage =
      data?.error?.message ||
      (error instanceof Error ? error.message : "Unable to access download");

    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="max-w-md text-center space-y-4">
          <div className="flex justify-center">
            <div className="size-16 rounded-full bg-warm-gray/10 flex items-center justify-center">
              <span className="text-3xl">😔</span>
            </div>
          </div>
          <h1 className="font-display text-2xl text-charcoal">Download Unavailable</h1>
          <p className="text-warm-gray">{errorMessage}</p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // AC-1, AC-2: Download available
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-md w-full text-center space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <span className="text-5xl">👶</span>
          <h1 className="font-display text-3xl text-charcoal">Your HD Photo</h1>
          <p className="text-warm-gray">
            {data.daysRemaining && data.daysRemaining > 0
              ? `Download available for ${data.daysRemaining} more day${data.daysRemaining === 1 ? "" : "s"}`
              : "Your download is ready"}
          </p>
        </div>

        {/* Download button - AC-4: Fresh URL generated each click */}
        <DownloadButton
          uploadId={uploadId}
          onSuccess={() => {
            // AC-5: Track re-download completion with is_redownload flag
            if (isPostHogConfigured()) {
              posthog.capture("redownload_completed", {
                upload_id: uploadId,
                is_redownload: true,
                days_since_purchase: data.daysRemaining !== null ? 30 - data.daysRemaining : null,
              });
            }
          }}
        />

        {/* Expiry warning for last 7 days */}
        {data.daysRemaining !== null && data.daysRemaining < 7 && (
          <p className="text-sm text-amber-600">
            ⏰ Only {data.daysRemaining} day{data.daysRemaining === 1 ? "" : "s"} left to download
          </p>
        )}

        {/* Back to result link */}
        <p className="text-sm text-warm-gray">
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-coral underline hover:no-underline"
          >
            Create another portrait
          </button>
        </p>
      </div>
    </div>
  );
}
