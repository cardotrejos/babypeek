import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface UploadProgressProps {
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Whether to show the cancel button */
  showCancel?: boolean;
  /** Called when cancel button is clicked */
  onCancel?: () => void;
  /** Optional className for the container */
  className?: string;
  /** Optional status message */
  statusMessage?: string;
}

// =============================================================================
// Component
// =============================================================================

export function UploadProgress({
  progress,
  showCancel = true,
  onCancel,
  className,
  statusMessage,
}: UploadProgressProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Determine status message
  const message =
    statusMessage ??
    (clampedProgress < 100 ? `Uploading... ${clampedProgress}%` : "Upload complete!");

  return (
    <div
      className={cn("flex flex-col items-center gap-4 rounded-[12px] bg-cream p-6", className)}
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Upload progress"
    >
      {/* Progress bar container */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-warm-gray/20">
        {/* Progress bar fill */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            clampedProgress < 100 ? "bg-coral" : "bg-green-500",
          )}
          style={{ width: `${clampedProgress}%` }}
        />

        {/* Animated shimmer effect during upload */}
        {clampedProgress < 100 && (
          <div
            className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{
              backgroundSize: "200% 100%",
            }}
          />
        )}
      </div>

      {/* Status text */}
      <div className="flex w-full items-center justify-between">
        <p className="text-sm font-medium text-charcoal">{message}</p>

        {/* Screen reader announcement */}
        <span className="sr-only" aria-live="polite">
          Upload progress: {clampedProgress} percent
        </span>

        {/* Cancel button */}
        {showCancel && clampedProgress < 100 && onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-warm-gray hover:text-charcoal"
            aria-label="Cancel upload"
          >
            <XIcon className="mr-1 size-4" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
