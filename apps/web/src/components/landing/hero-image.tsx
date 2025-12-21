import { cn } from "@/lib/utils"

interface HeroImageProps {
  className?: string
}

/**
 * HeroImage Component
 * Displays a before/after comparison for the landing page hero section.
 * 
 * Uses placeholder gradients until real images are available.
 * Optimized for LCP with eager loading and high fetch priority.
 * 
 * @see Story 2.2 - Hero Section with Value Proposition
 */
export function HeroImage({ className }: HeroImageProps) {
  // TODO: Replace with actual before/after images when available (Task 4)
  // For now, using gradient placeholders that match the warm UX design
  const hasRealImages = false

  if (!hasRealImages) {
    return (
      <div
        className={cn(
          "relative aspect-video rounded-xl overflow-hidden",
          "shadow-lg bg-gradient-to-br from-coral-light via-cream to-coral-light",
          className
        )}
        role="img"
        aria-label="Before: 4D ultrasound image. After: AI-generated photorealistic baby portrait"
      >
        {/* Placeholder content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-coral/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-coral"
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
            <p className="text-warm-gray font-body text-sm">
              See the magic transformation
            </p>
          </div>
        </div>

        {/* Decorative "Before" label corner */}
        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-white/90 rounded-lg shadow-md">
          <span className="text-charcoal font-body text-xs font-medium">
            Before → After
          </span>
        </div>
      </div>
    )
  }

  // Real image implementation for when images are available
  return (
    <div
      className={cn(
        "relative aspect-video rounded-xl overflow-hidden",
        "shadow-lg",
        className
      )}
    >
      {/* Main "After" image - the result */}
      <picture>
        <source srcSet="/images/hero-after.webp" type="image/webp" />
        <img
          src="/images/hero-after.jpg"
          alt="AI-generated photorealistic baby portrait from 4D ultrasound"
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
      </picture>

      {/* Before image in corner for comparison */}
      <div className="absolute bottom-4 left-4 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shadow-md border-2 border-white">
        <picture>
          <source srcSet="/images/hero-before.webp" type="image/webp" />
          <img
            src="/images/hero-before.jpg"
            alt="Original 4D ultrasound image"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </picture>
      </div>
    </div>
  )
}
