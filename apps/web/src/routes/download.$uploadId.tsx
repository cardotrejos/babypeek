import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSession } from "@/lib/session";
import { DownloadButton, DownloadExpired } from "@/components/download";
import { API_BASE_URL } from "@/lib/api-config";
import { posthog, isPostHogConfigured } from "@/lib/posthog";

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
  const sessionToken = getSession(uploadId);

  // Check download eligibility
  const { data, isLoading, error } = useQuery<DownloadStatus>({
    queryKey: ["download-status", uploadId],
    queryFn: async () => {
      if (!sessionToken) {
        return {
          canDownload: false,
          isExpired: false,
          expiresAt: null,
          daysRemaining: null,
          error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
        };
      }

      const response = await fetch(`${API_BASE_URL}/api/download/${uploadId}/status`, {
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
      });

      const result = await response.json();

      // AC-5: Track expiry view
      if (result.isExpired && isPostHogConfigured()) {
        posthog.capture("download_expired_viewed", {
          upload_id: uploadId,
        });
      }

      return result;
    },
    enabled: !!sessionToken,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="size-12 animate-spin rounded-full border-4 border-coral border-t-transparent" />
      </div>
    );
  }

  // No session - user may have come from a different device
  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="flex justify-center">
            <div className="size-16 rounded-full bg-warm-gray/10 flex items-center justify-center">
              <span className="text-3xl">🔒</span>
            </div>
          </div>
          <h1 className="font-display text-2xl text-charcoal">Session Not Found</h1>
          <p className="text-warm-gray">
            We couldn't find your download session. This usually happens if you're on a different
            device. Try accessing the link from your email.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral/90 transition-colors"
          >
            Create New Portrait
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
          sessionToken={sessionToken}
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
