import type React from "react"
import { useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

/**
 * Example data for gallery cards
 * Using placeholder gradients until real images are available
 */
const examples = [
  { id: 1, label: "Example 1" },
  { id: 2, label: "Example 2" },
  { id: 3, label: "Example 3" },
  { id: 4, label: "Example 4" },
]

interface ExampleGalleryProps {
  className?: string
}

/**
 * ExampleGallery Component
 * Displays a horizontally scrollable gallery of before/after transformation examples.
 * 
 * Features:
 * - Horizontal scroll with snap points
 * - Touch-friendly swipe on mobile
 * - Keyboard navigation (arrow keys)
 * - Accessible with role="region" and aria-label
 * 
 * @see Story 2.3 - Before/After Example Gallery
 */
export function ExampleGallery({ className }: ExampleGalleryProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return

    const scrollAmount = 300 // Approximate card width

    if (e.key === "ArrowRight") {
      e.preventDefault()
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" })
    }
  }, [])

  return (
    <div
      role="region"
      aria-label="Example transformations gallery"
      className={cn("w-full", className)}
    >
      <div
        ref={scrollContainerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex gap-4 overflow-x-auto snap-x snap-mandatory",
          "pb-4 -mx-4 px-4", // Edge-to-edge scrolling on mobile
          "scrollbar-hide", // Hide scrollbar but keep functionality
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 rounded-lg"
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {examples.map((example, index) => (
          <GalleryCard
            key={example.id}
            index={index + 1}
            label={example.label}
            loading={index < 2 ? "eager" : "lazy"}
          />
        ))}
      </div>
    </div>
  )
}

interface GalleryCardProps {
  index: number
  label: string
  /**
   * Loading strategy for images. Currently passed through for when real images
   * are added (hasRealImages flag). First 2 cards use "eager", rest use "lazy".
   */
  loading?: "eager" | "lazy"
}

/**
 * GalleryCard Component
 * Displays a single before/after transformation example.
 * 
 * Uses placeholder gradients until real images are available.
 * Reserves aspect ratio to prevent layout shift.
 */
function GalleryCard({ index, label, loading = "lazy" }: GalleryCardProps) {
  // Flag for when real images become available
  const hasRealImages = false

  return (
    <div
      className={cn(
        "flex-shrink-0 snap-center",
        "w-[280px] sm:w-[320px]", // Card width
        "bg-white rounded-xl shadow-md overflow-hidden"
      )}
    >
      <div className="grid grid-cols-2 gap-1 p-2">
        {/* Before image */}
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
          {hasRealImages ? (
            <picture>
              <source
                srcSet={`/images/examples/example-${index}-before.webp`}
                type="image/webp"
              />
              <img
                src={`/images/examples/example-${index}-before.jpg`}
                alt={`${label}: Original 4D ultrasound`}
                className="w-full h-full object-cover"
                loading={loading}
                width={140}
                height={105}
              />
            </picture>
          ) : (
            <div
              className="w-full h-full bg-gradient-to-br from-warm-gray/20 to-charcoal/10 flex items-center justify-center"
              role="img"
              aria-label={`${label}: Original 4D ultrasound (placeholder)`}
            >
              <svg
                className="w-8 h-8 text-warm-gray/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/50 text-white text-xs rounded font-body">
            Before
          </span>
        </div>

        {/* After image */}
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
          {hasRealImages ? (
            <picture>
              <source
                srcSet={`/images/examples/example-${index}-after.webp`}
                type="image/webp"
              />
              <img
                src={`/images/examples/example-${index}-after.jpg`}
                alt={`${label}: AI-generated baby portrait`}
                className="w-full h-full object-cover"
                loading={loading}
                width={140}
                height={105}
              />
            </picture>
          ) : (
            <div
              className="w-full h-full bg-gradient-to-br from-coral-light to-cream flex items-center justify-center"
              role="img"
              aria-label={`${label}: AI-generated baby portrait (placeholder)`}
            >
              <svg
                className="w-8 h-8 text-coral/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-coral/80 text-white text-xs rounded font-body">
            After
          </span>
        </div>
      </div>
    </div>
  )
}
