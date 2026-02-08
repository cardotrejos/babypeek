import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { posthog, isPostHogConfigured } from "@/lib/posthog";

/**
 * Result variant from the API
 * SECURITY NOTE: Always display previewUrl (watermarked) to unpaid users.
 * resultUrl contains the HD unwatermarked version - only show after purchase.
 */
export interface ResultVariant {
  resultId: string;
  resultUrl: string; // HD unwatermarked - only for paid users
  previewUrl: string | null; // Watermarked preview - safe to display
  promptVersion: string;
  variantIndex: number;
}

interface ResultsGalleryProps {
  /** All result variants */
  results: ResultVariant[];
  /** Currently selected result index */
  selectedIndex: number;
  /** Callback when a result is selected */
  onSelect: (index: number) => void;
  /** Upload ID for analytics */
  uploadId?: string;
  /** Whether user has purchased (show HD if true) */
  hasPurchased?: boolean;
  /** Callback when all images have loaded */
  onAllImagesLoaded?: () => void;
  className?: string;
}

/**
 * Prompt version display names
 */
const PROMPT_LABELS: Record<string, string> = {
  v3: "Style A",
  "v3-json": "Style B",
  v4: "Style C",
  "v4-json": "Style D",
};

/**
 * Canvas-rendered image for unpaid users.
 * Prevents right-click save and URL inspection since pixels are drawn on canvas.
 * Adds a client-side "PREVIEW" watermark overlay.
 */
function CanvasImage({
  src,
  alt,
  onLoad,
  className,
}: {
  src: string;
  alt: string;
  onLoad?: () => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onLoadRef = useRef(onLoad);

  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;

    let isDisposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let removeResizeListener: (() => void) | null = null;
    const img = new Image();
    img.crossOrigin = "anonymous";

    const drawImageCover = (image: HTMLImageElement): boolean => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return false;

      const ctx = currentCanvas.getContext("2d");
      if (!ctx) return false;

      const rect = currentCanvas.getBoundingClientRect();
      const displayWidth = Math.max(
        1,
        Math.round(rect.width || currentCanvas.clientWidth || image.width),
      );
      const displayHeight = Math.max(
        1,
        Math.round(rect.height || currentCanvas.clientHeight || image.height),
      );
      const devicePixelRatio =
        typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
      const targetWidth = Math.max(1, Math.round(displayWidth * devicePixelRatio));
      const targetHeight = Math.max(1, Math.round(displayHeight * devicePixelRatio));

      if (currentCanvas.width !== targetWidth) {
        currentCanvas.width = targetWidth;
      }
      if (currentCanvas.height !== targetHeight) {
        currentCanvas.height = targetHeight;
      }

      const imageWidth = image.naturalWidth || image.width;
      const imageHeight = image.naturalHeight || image.height;
      const imageAspect = imageWidth / imageHeight;
      const targetAspect = targetWidth / targetHeight;

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = imageWidth;
      let sourceHeight = imageHeight;

      // Match CSS object-fit: cover by center-cropping the source image.
      if (imageAspect > targetAspect) {
        sourceWidth = imageHeight * targetAspect;
        sourceX = (imageWidth - sourceWidth) / 2;
      } else if (imageAspect < targetAspect) {
        sourceHeight = imageWidth / targetAspect;
        sourceY = (imageHeight - sourceHeight) / 2;
      }

      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight,
      );

      // Add client-side watermark overlay
      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((-30 * Math.PI) / 180);
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.font = `bold ${Math.max(20, Math.floor(targetWidth / 8))}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PREVIEW", 0, 0);
      ctx.restore();

      return true;
    };

    img.onload = () => {
      if (isDisposed) return;
      const didDraw = drawImageCover(img);
      if (!didDraw) {
        onLoadRef.current?.();
        return;
      }

      const redraw = () => {
        if (isDisposed) return;
        drawImageCover(img);
      };

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(redraw);
        resizeObserver.observe(canvas);
      } else if (typeof window !== "undefined") {
        window.addEventListener("resize", redraw);
        removeResizeListener = () => window.removeEventListener("resize", redraw);
      }

      onLoadRef.current?.();
    };

    img.onerror = () => {
      if (isDisposed) return;
      // Fallback: still call onLoad so skeleton goes away
      onLoadRef.current?.();
    };

    img.src = src;

    return () => {
      isDisposed = true;
      resizeObserver?.disconnect();
      removeResizeListener?.();
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
      aria-label={alt}
    />
  );
}

/**
 * Skeleton placeholder for loading images
 */
function ImageSkeleton({ label }: { label: string }) {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-warm-gray/20 animate-pulse">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-coral/30 border-t-coral animate-spin" />
      </div>
      <span className="absolute bottom-1 left-1 px-2 py-0.5 text-xs rounded font-body bg-black/30 text-white/70">
        {label}
      </span>
    </div>
  );
}

/**
 * ResultsGallery Component
 *
 * Displays a 2x2 grid of AI-generated baby portraits with progressive loading.
 * Shows skeletons for images that haven't loaded yet.
 *
 * Features:
 * - 2x2 thumbnail grid with progressive loading
 * - Skeleton placeholders while images load
 * - Tap to select (only for loaded images)
 * - Selected image highlighted
 * - Label showing style name
 */
export function ResultsGallery({
  results,
  selectedIndex,
  onSelect,
  uploadId,
  hasPurchased = false,
  onAllImagesLoaded,
  className,
}: ResultsGalleryProps) {
  // Track which images have loaded
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const handleImageLoad = useCallback(
    (index: number) => {
      setLoadedImages((prev) => {
        if (prev.has(index)) {
          return prev;
        }

        const newSet = new Set(prev);
        newSet.add(index);

        // Check if all images are loaded
        if (newSet.size === results.length && onAllImagesLoaded) {
          // Slight delay to ensure DOM is updated
          setTimeout(onAllImagesLoaded, 100);
        }

        return newSet;
      });
    },
    [results.length, onAllImagesLoaded],
  );

  const handleSelect = (index: number) => {
    // Only allow selecting loaded images
    if (!loadedImages.has(index)) return;
    if (index === selectedIndex) return;

    onSelect(index);

    // Track variant selection
    if (isPostHogConfigured() && uploadId) {
      posthog.capture("result_variant_selected", {
        upload_id: uploadId,
        variant_index: index + 1,
        prompt_version: results[index]?.promptVersion,
      });
    }
  };

  // Always show 4 slots - either with results or loading skeletons
  const slots = Array.from({ length: 4 }, (_, i) => results[i] || null);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-2">
        {slots.map((result, index) => {
          const label = result
            ? PROMPT_LABELS[result.promptVersion] || `Style ${index + 1}`
            : `Style ${String.fromCharCode(65 + index)}`;

          // Show skeleton if no result or image hasn't loaded
          if (!result) {
            return <ImageSkeleton key={`skeleton-${index}`} label={label} />;
          }

          const isLoaded = loadedImages.has(index);
          const imageUrl = hasPurchased
            ? (result.resultUrl ?? result.previewUrl)
            : result.previewUrl;

          if (!imageUrl) {
            return <ImageSkeleton key={`missing-${result.resultId}`} label={label} />;
          }

          return (
            <button
              key={result.resultId}
              onClick={() => handleSelect(index)}
              disabled={!isLoaded}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden transition-all",
                "focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2",
                isLoaded && index === selectedIndex
                  ? "ring-2 ring-coral ring-offset-2 scale-[1.02]"
                  : isLoaded
                    ? "opacity-70 hover:opacity-100"
                    : "cursor-wait",
              )}
              // Prevent right-click to save image
              onContextMenu={(e) => !hasPurchased && e.preventDefault()}
            >
              {/* Skeleton background while loading */}
              {!isLoaded && (
                <div className="absolute inset-0 bg-warm-gray/20 animate-pulse">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-coral/30 border-t-coral animate-spin" />
                  </div>
                </div>
              )}

              {/* SECURITY: Canvas rendering for unpaid users prevents right-click save */}
              {hasPurchased ? (
                <img
                  src={imageUrl}
                  alt={`Baby portrait - ${label}`}
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    isLoaded ? "opacity-100" : "opacity-0",
                  )}
                  loading={index < 2 ? "eager" : "lazy"}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onLoad={() => handleImageLoad(index)}
                />
              ) : (
                <CanvasImage
                  src={imageUrl}
                  alt={`Baby portrait - ${label}`}
                  className={cn(
                    "transition-opacity duration-300",
                    isLoaded ? "opacity-100" : "opacity-0",
                  )}
                  onLoad={() => handleImageLoad(index)}
                />
              )}

              {/* Style label */}
              <span
                className={cn(
                  "absolute bottom-1 left-1 px-2 py-0.5 text-xs rounded font-body",
                  isLoaded && index === selectedIndex
                    ? "bg-coral text-white"
                    : "bg-black/50 text-white",
                )}
              >
                {label}
              </span>

              {/* Selected indicator */}
              {isLoaded && index === selectedIndex && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-coral rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
