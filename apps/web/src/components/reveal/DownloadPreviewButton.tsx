import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { posthog, isPostHogConfigured } from "@/lib/posthog"
import { cn } from "@/lib/utils"

interface DownloadPreviewButtonProps {
  previewUrl: string
  resultId: string
  variant?: "default" | "outline" | "ghost"
  className?: string
}

/**
 * Detect iOS devices for special download handling
 * iOS Safari doesn't support programmatic downloads
 */
export function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

/**
 * DownloadPreviewButton Component
 * Story 5.6: Download Preview Button (AC-1, AC-2, AC-3)
 *
 * Downloads the watermarked preview image with:
 * - Date-based filename: babypeek-preview-YYYY-MM-DD.jpg
 * - Loading state during download
 * - Error handling with user feedback
 * - PostHog analytics tracking
 * - iOS Safari special handling (opens in new tab with instructions)
 */
export function DownloadPreviewButton({
  previewUrl,
  resultId,
  variant = "ghost",
  className,
}: DownloadPreviewButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isIOS = detectIOS()

  const handleDownload = async () => {
    setIsDownloading(true)
    setError(null)

    // Track download started (AC-3)
    if (isPostHogConfigured()) {
      posthog.capture("preview_download_started", {
        result_id: resultId,
        is_ios: isIOS,
      })
    }

    try {
      // iOS Safari: open in new tab (user saves with long-press)
      // H1 FIX: Show toast with instructions for iOS users
      if (isIOS) {
        window.open(previewUrl, "_blank")

        // Show instructions toast for iOS users
        toast.info("Saving on iOS", {
          description: "Long-press the image and tap \"Add to Photos\"",
          duration: 5000,
        })

        const filename = `babypeek-preview-${new Date().toISOString().split("T")[0]}.jpg`
        if (isPostHogConfigured()) {
          posthog.capture("preview_download_completed", {
            result_id: resultId,
            filename,
            method: "ios_new_tab",
          })
        }
        setIsDownloading(false)
        return
      }

      // Standard download: fetch as blob for custom filename (AC-2)
      // M3 FIX: Better error handling for network issues
      let response: Response
      try {
        response = await fetch(previewUrl)
      } catch (fetchError) {
        // Network error (offline, CORS, etc.)
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine
        throw new Error(
          isOffline
            ? "Please check your connection and try again."
            : "Failed to fetch image"
        )
      }

      if (!response.ok) {
        throw new Error("Failed to fetch image")
      }

      const blob = await response.blob()

      // Generate filename with date: babypeek-preview-YYYY-MM-DD.jpg (AC-2)
      const date = new Date().toISOString().split("T")[0]
      const filename = `babypeek-preview-${date}.jpg`

      // M4 FIX: Create object URL and trigger download with proper cleanup
      const url = URL.createObjectURL(blob)
      try {
        const link = document.createElement("a")
        link.href = url
        link.download = filename

        // Append to body, click, and cleanup
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } finally {
        // Always revoke URL, even if click throws
        URL.revokeObjectURL(url)
      }

      // Track download completed (AC-3)
      if (isPostHogConfigured()) {
        posthog.capture("preview_download_completed", {
          result_id: resultId,
          filename,
          method: "blob_download",
        })
      }
    } catch (err) {
      console.error("[DownloadPreviewButton] Download failed:", err)
      const errorMessage =
        err instanceof Error ? err.message : "Download failed. Please try again."
      setError(errorMessage)

      // Track download failed (AC-3)
      if (isPostHogConfigured()) {
        posthog.capture("preview_download_failed", {
          result_id: resultId,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    } finally {
      setIsDownloading(false)
    }
  }

  // M1 FIX: Apply className to Button directly for proper flex layout
  return (
    <div>
      <Button
        variant={variant}
        onClick={handleDownload}
        disabled={isDownloading}
        className={cn("gap-2", className)}
        data-testid="download-preview-button"
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isDownloading ? "Downloading..." : "Download Preview"}
      </Button>

      {error && (
        <p className="text-sm text-red-500 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
