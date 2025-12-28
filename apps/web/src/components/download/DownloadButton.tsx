import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle } from "lucide-react";
import { posthog, isPostHogConfigured } from "@/lib/posthog";
import { API_BASE_URL } from "@/lib/api-config";

/**
 * DownloadButton Component
 * Story 7.3: In-App Download Button
 *
 * Enables users to download their HD image directly from the app.
 * - AC-1: Downloads HD image when tapped
 * - AC-2: Shows download progress (loading states)
 * - AC-3: Filename is "babypeek-{date}.jpg"
 * - AC-4: Success confirmation shown after download
 * - AC-5: Tracks download_clicked event to PostHog
 * - AC-6: Shows loading state while fetching download URL
 */

interface DownloadButtonProps {
  uploadId: string;
  sessionToken: string;
  /** Result ID for analytics tracking (Story 7.3 AC-5) */
  resultId?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

type DownloadState = "idle" | "fetching" | "downloading" | "success" | "error";

export function DownloadButton({
  uploadId,
  sessionToken,
  resultId,
  onSuccess,
  onError,
  className,
}: DownloadButtonProps) {
  const [state, setState] = useState<DownloadState>("idle");

  const handleDownload = useCallback(async () => {
    // AC-5: Track download clicked (includes upload_id, result_id, source)
    if (isPostHogConfigured()) {
      posthog.capture("download_clicked", {
        upload_id: uploadId,
        result_id: resultId,
        source: "in_app",
      });
    }

    setState("fetching");

    try {
      // Fetch download URL from API
      const response = await fetch(`${API_BASE_URL}/api/download/${uploadId}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Session-Token": sessionToken,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to get download link");
      }

      const data = await response.json();
      const { downloadUrl, suggestedFilename } = data;

      setState("downloading");

      // AC-3: Generate filename with date (use API suggested or fallback)
      const filename =
        suggestedFilename || `babypeek-${new Date().toISOString().split("T")[0]}.jpg`;

      // Trigger download via hidden anchor
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // AC-4: Show success state
      setState("success");

      // Track completion
      if (isPostHogConfigured()) {
        posthog.capture("download_completed", {
          upload_id: uploadId,
          result_id: resultId,
          source: "in_app",
        });
      }

      onSuccess?.();

      // Reset to idle after showing success
      setTimeout(() => setState("idle"), 3000);
    } catch (error) {
      setState("error");

      const errorMessage = error instanceof Error ? error.message : "Download failed";

      // Track failure
      if (isPostHogConfigured()) {
        posthog.capture("download_failed", {
          upload_id: uploadId,
          result_id: resultId,
          error: errorMessage,
        });
      }

      onError?.(errorMessage);
      // Keep error state - user must click again to retry (better UX)
    }
  }, [uploadId, sessionToken, resultId, onSuccess, onError]);

  const buttonContent = {
    idle: (
      <>
        <Download className="size-5 mr-2" />
        Download HD Portrait
      </>
    ),
    fetching: (
      <>
        <Loader2 className="size-5 mr-2 animate-spin" />
        Preparing download...
      </>
    ),
    downloading: (
      <>
        <Loader2 className="size-5 mr-2 animate-spin" />
        Downloading...
      </>
    ),
    success: (
      <>
        <CheckCircle className="size-5 mr-2" />
        Downloaded!
      </>
    ),
    error: (
      <>
        <Download className="size-5 mr-2" />
        Try Again
      </>
    ),
  };

  return (
    <Button
      size="lg"
      onClick={handleDownload}
      disabled={state === "fetching" || state === "downloading"}
      className={`w-full bg-coral hover:bg-coral/90 text-white font-body text-lg py-6 ${className || ""}`}
      data-testid="download-button"
    >
      {buttonContent[state]}
    </Button>
  );
}
