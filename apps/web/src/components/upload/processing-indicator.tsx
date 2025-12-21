import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

// =============================================================================
// Types
// =============================================================================

export interface ProcessingIndicatorProps {
  /** The message to display (e.g., "Preparing image...") */
  message?: string
  /** Optional className for the container */
  className?: string
}

// =============================================================================
// Component
// =============================================================================

/**
 * Processing indicator overlay shown during HEIC conversion
 * 
 * Features:
 * - Semi-transparent overlay with spinner
 * - Uses coral color scheme per design system
 * - Accessible with aria-live for screen readers
 */
export function ProcessingIndicator({
  message = "Preparing image...",
  className,
}: ProcessingIndicatorProps) {
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
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        {/* Animated spinner in coral color */}
        <Loader2
          className="size-8 animate-spin text-coral"
          aria-hidden="true"
        />
        {/* Processing message */}
        <p className="text-sm font-medium text-charcoal">{message}</p>
        {/* Screen reader only description */}
        <span className="sr-only">
          Please wait while we prepare your image for upload.
        </span>
      </div>
    </div>
  )
}
