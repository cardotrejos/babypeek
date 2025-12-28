import { cn } from "@/lib/utils";

interface HeroImageProps {
  className?: string;
}

/**
 * HeroImage Component
 * Displays a before/after comparison for the landing page hero section.
 *
 * Uses real example images from 4D ultrasounds.
 * Optimized for LCP with eager loading and high fetch priority.
 *
 * @see Story 2.2 - Hero Section with Value Proposition
 */
export function HeroImage({ className }: HeroImageProps) {
  return (
    <div className={cn("relative aspect-video rounded-xl overflow-hidden", "shadow-lg", className)}>
      {/* Main "After" image - the result */}
      <img
        src="/images/examples/result-1.jpeg"
        alt="AI-generated photorealistic baby portrait from 4D ultrasound"
        className="w-full h-full object-cover"
        loading="eager"
        fetchPriority="high"
      />

      {/* Before image in corner for comparison */}
      <div className="absolute bottom-4 left-4 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden shadow-md border-2 border-white">
        <img
          src="/images/examples/4d-ultra.jpeg"
          alt="Original 4D ultrasound image"
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      {/* Label */}
      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-coral/90 rounded-lg shadow-md">
        <span className="text-white font-body text-xs font-medium">Before → After</span>
      </div>
    </div>
  );
}
