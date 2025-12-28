import type React from "react"
import { useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

/**
 * Example data for gallery cards
 * Real before/after examples from 4D ultrasounds
 */
const examples = [
  {
    id: 1,
    label: "Example 1",
    before: "/images/examples/4d-ultra.jpeg",
    after: "/images/examples/result-1.jpeg",
  },
  {
    id: 2,
    label: "Example 2",
    before: "/images/examples/4d-ultra.jpeg",
    after: "/images/examples/result-2.jpeg",
  },
  {
    id: 3,
    label: "Example 3",
    before: "/images/examples/4d-ultra-2.jpeg",
    after: "/images/examples/result-3.jpeg",
  },
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
            before={example.before}
            after={example.after}
            label={example.label}
            loading={index < 2 ? "eager" : "lazy"}
          />
        ))}
      </div>
      {/* Permission disclaimer */}
      <p className="text-center text-xs text-warm-gray/70 mt-4 italic">
        Photos shared with permission from the families.
      </p>
    </div>
  )
}

interface GalleryCardProps {
  before: string
  after: string
  label: string
  /**
   * Loading strategy for images. First 2 cards use "eager", rest use "lazy".
   */
  loading?: "eager" | "lazy"
}

/**
 * GalleryCard Component
 * Displays a single before/after transformation example with real images.
 */
function GalleryCard({ before, after, label, loading = "lazy" }: GalleryCardProps) {
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
          <img
            src={before}
            alt={`${label}: Original 4D ultrasound`}
            className="w-full h-full object-cover"
            loading={loading}
            width={140}
            height={105}
          />
          <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/50 text-white text-xs rounded font-body">
            Before
          </span>
        </div>

        {/* After image */}
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
          <img
            src={after}
            alt={`${label}: AI-generated baby portrait`}
            className="w-full h-full object-cover"
            loading={loading}
            width={140}
            height={105}
          />
          <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-coral/80 text-white text-xs rounded font-body">
            After
          </span>
        </div>
      </div>
    </div>
  )
}
