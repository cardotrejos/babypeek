import { cn } from "@/lib/utils";

interface HeroImageProps {
  className?: string;
}

export function HeroImage({ className }: HeroImageProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Decorative blob behind the image */}
      <div
        className="absolute -inset-4 sm:-inset-8 bg-rose/40 animate-blob max-sm:animate-none opacity-60 blur-2xl"
        aria-hidden="true"
      />

      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
        {/* Before: Ultrasound */}
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-xl ring-1 ring-charcoal/5">
          <img
            src="/images/examples/4d-ultra.jpeg"
            alt="Original 4D ultrasound image"
            className="w-full h-full object-cover"
            width={600}
            height={800}
            decoding="async"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/30 to-transparent" />
          <span className="absolute bottom-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm text-charcoal text-xs font-medium rounded-full">
            4D Ultrasound
          </span>
        </div>

        {/* Arrow connector */}
        <div className="flex flex-col items-center gap-2 animate-float max-sm:animate-none">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-coral" aria-hidden="true">
            <path d="M6 16h16m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-medium text-warm-gray tracking-widest uppercase">
            AI
          </span>
        </div>

        {/* After: Baby Portrait */}
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-coral/10">
          <img
            src="/images/examples/result-1.jpeg"
            alt="AI-generated realistic baby portrait from 4D ultrasound"
            className="w-full h-full object-cover"
            width={600}
            height={800}
            decoding="async"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal/20 to-transparent" />
          <span className="absolute bottom-3 left-3 px-3 py-1 bg-coral/90 backdrop-blur-sm text-white text-xs font-medium rounded-full">
            Baby Portrait
          </span>
        </div>
      </div>
    </div>
  );
}
