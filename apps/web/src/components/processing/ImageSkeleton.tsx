import { cn } from "@/lib/utils";

interface ImageSkeletonProps {
  className?: string;
}

/**
 * Shimmer skeleton placeholder for the result image area
 * Uses 4:3 aspect ratio and max width of 448px (max-w-md) for mobile-first design
 */
export function ImageSkeleton({ className }: ImageSkeletonProps) {
  return (
    <div className={cn("w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden", className)}>
      {/* Shimmer effect using gradient animation */}
      <div className="relative w-full h-full bg-charcoal/5">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer"
          style={{
            backgroundSize: "200% 100%",
          }}
        />
        {/* Center placeholder content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-warm-gray/50">
            <svg
              className="w-12 h-12 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-body">Your portrait will appear here</span>
          </div>
        </div>
      </div>
    </div>
  );
}
