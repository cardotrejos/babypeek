import { cn } from "@/lib/utils"
import { posthog, isPostHogConfigured } from "@/lib/posthog"

/**
 * Result variant from the API
 */
export interface ResultVariant {
  resultId: string
  resultUrl: string
  previewUrl: string | null
  promptVersion: string
  variantIndex: number
}

interface ResultsGalleryProps {
  /** All result variants */
  results: ResultVariant[]
  /** Currently selected result index */
  selectedIndex: number
  /** Callback when a result is selected */
  onSelect: (index: number) => void
  /** Upload ID for analytics */
  uploadId?: string
  className?: string
}

/**
 * Prompt version display names
 */
const PROMPT_LABELS: Record<string, string> = {
  v3: "Style A",
  "v3-json": "Style B",
  v4: "Style C",
  "v4-json": "Style D",
}

/**
 * ResultsGallery Component
 *
 * Displays a 2x2 grid of AI-generated baby portraits.
 * Users can tap/click to select their favorite and view it enlarged.
 *
 * Features:
 * - 2x2 thumbnail grid
 * - Tap to select
 * - Selected image highlighted
 * - Label showing style name
 */
export function ResultsGallery({
  results,
  selectedIndex,
  onSelect,
  uploadId,
  className,
}: ResultsGalleryProps) {
  const handleSelect = (index: number) => {
    if (index === selectedIndex) return

    onSelect(index)

    // Track variant selection
    if (isPostHogConfigured() && uploadId) {
      posthog.capture("result_variant_selected", {
        upload_id: uploadId,
        variant_index: index + 1,
        prompt_version: results[index]?.promptVersion,
      })
    }
  }

  if (results.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm text-warm-gray text-center">
        Choose your favorite style
      </p>
      <div className="grid grid-cols-2 gap-2">
        {results.map((result, index) => (
          <button
            key={result.resultId}
            onClick={() => handleSelect(index)}
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden transition-all",
              "focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2",
              index === selectedIndex
                ? "ring-2 ring-coral ring-offset-2 scale-[1.02]"
                : "opacity-70 hover:opacity-100"
            )}
          >
            <img
              src={result.resultUrl}
              alt={`Baby portrait - ${PROMPT_LABELS[result.promptVersion] || `Style ${index + 1}`}`}
              className="w-full h-full object-cover"
              loading={index < 2 ? "eager" : "lazy"}
            />
            {/* Style label */}
            <span
              className={cn(
                "absolute bottom-1 left-1 px-2 py-0.5 text-xs rounded font-body",
                index === selectedIndex
                  ? "bg-coral text-white"
                  : "bg-black/50 text-white"
              )}
            >
              {PROMPT_LABELS[result.promptVersion] || `Style ${index + 1}`}
            </span>
            {/* Selected indicator */}
            {index === selectedIndex && (
              <div className="absolute top-1 right-1 w-5 h-5 bg-coral rounded-full flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
