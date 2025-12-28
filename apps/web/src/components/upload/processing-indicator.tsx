import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface ProcessingIndicatorProps {
  /** The message to display (e.g., "Preparing image...") */
  message?: string;
  /** Optional progress percentage (0-100) */
  progress?: number | null;
  /** Optional className for the container */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Processing indicator overlay shown during image processing
 *
 * Features:
 * - Semi-transparent overlay with spinner
 * - Uses coral color scheme per design system
 * - Accessible with aria-live for screen readers
 * - Optional progress percentage display
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ProcessingIndicator message="Preparing image..." />
 *
 * // With progress
 * <ProcessingIndicator
 *   message="Compressing image..."
 *   progress={45}
 * />
 * ```
 */
export function ProcessingIndicator({
  message = "Preparing image...",
  progress,
  className,
}: ProcessingIndicatorProps) {
  // Build display message with progress if available
  const displayMessage =
    progress !== null && progress !== undefined
      ? `${message.replace(/\.\.\.$/, "")}... ${Math.round(progress)}%`
      : message;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        // Overlay positioning
        "absolute inset-0 z-10",
        // Semi-transparent background
        "flex items-center justify-center",
        "bg-cream/80 backdrop-blur-[2px]",
        // Border radius to match parent
        "rounded-[12px]",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        {/* Animated spinner in coral color */}
        <Loader2 className="size-8 animate-spin text-coral" aria-hidden="true" />
        {/* Processing message */}
        <p className="text-sm font-medium text-charcoal">{displayMessage}</p>
        {/* Progress bar for compression */}
        {progress !== null && progress !== undefined && (
          <div className="w-32 h-1.5 bg-cream-dark/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-coral transition-all duration-200 ease-out rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}
        {/* Screen reader only description */}
        <span className="sr-only">
          Please wait while we prepare your image for upload.
          {progress !== null && progress !== undefined && ` Progress: ${Math.round(progress)}%`}
        </span>
      </div>
    </div>
  );
}
