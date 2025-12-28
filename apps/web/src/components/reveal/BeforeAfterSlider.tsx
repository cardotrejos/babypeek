import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  initialPosition?: number; // 0-100
  /** Disable image protection (allow right-click, drag) - for paid users */
  allowImageSave?: boolean;
  className?: string;
}

/**
 * BeforeAfterSlider Component
 * Story 5.5: Before/After Comparison Slider
 *
 * Features:
 * - AC-1: Drag left/right to reveal original vs result
 * - AC-2: Touch-friendly 48px handle (NFR-5.5)
 * - AC-3: Keyboard control with arrow keys
 * - AC-4: Both images same dimensions via object-fit
 */
export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Original",
  afterLabel = "AI Generated",
  initialPosition = 50,
  allowImageSave = false,
  className,
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate position from pointer event (Task 2)
  const calculatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return 50;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    return Math.max(0, Math.min(100, percentage));
  }, []);

  // Mouse handlers (Task 2)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setPosition(calculatePosition(e.clientX));
    },
    [calculatePosition],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition(calculatePosition(e.clientX));
    },
    [isDragging, calculatePosition],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers (Task 2)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      setPosition(calculatePosition(e.touches[0].clientX));
    },
    [calculatePosition],
  );

  // Keyboard handlers (Task 4)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 5; // 5% per key press
    switch (e.key) {
      case "ArrowLeft":
        setPosition((p) => Math.max(0, p - step));
        e.preventDefault();
        break;
      case "ArrowRight":
        setPosition((p) => Math.min(100, p + step));
        e.preventDefault();
        break;
      case "Home":
        setPosition(0);
        e.preventDefault();
        break;
      case "End":
        setPosition(100);
        e.preventDefault();
        break;
    }
  }, []);

  // Add/remove global event listeners for drag (Task 2)
  const handleDocumentTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        setPosition(calculatePosition(touch.clientX));
      }
    },
    [isDragging, calculatePosition],
  );

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("touchmove", handleDocumentTouchMove, { passive: false });
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchmove", handleDocumentTouchMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleDocumentTouchMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-ew-resize select-none touch-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2",
        className,
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onKeyDown={handleKeyDown}
      // Prevent right-click context menu
      onContextMenu={(e) => !allowImageSave && e.preventDefault()}
      tabIndex={0}
      role="slider"
      aria-label="Image comparison slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      aria-valuetext={`${Math.round(position)}% showing original image`}
      data-testid="before-after-slider"
    >
      {/* After image (AI result) - full width background (Task 5) */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
        data-testid="after-image"
      />

      {/* Before image (original) - clipped by position (Task 1, 5) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute top-0 left-0 h-full w-full object-cover"
          draggable={false}
          data-testid="before-image"
        />
      </div>

      {/* Slider handle (Task 3) */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_rgba(0,0,0,0.4)]"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
        data-testid="slider-handle"
      >
        {/* Handle grip - 48px touch target (NFR-5.5) */}
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-12 h-12 rounded-full bg-white shadow-lg", // 48px = w-12
            "flex items-center justify-center",
            "cursor-grab transition-transform duration-150 will-change-transform",
            isDragging && "cursor-grabbing scale-110",
          )}
        >
          <div className="flex gap-0.5">
            <ChevronLeft className="w-4 h-4 text-charcoal" />
            <ChevronRight className="w-4 h-4 text-charcoal" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/60 rounded text-white text-sm font-body pointer-events-none">
        {beforeLabel}
      </div>
      <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/60 rounded text-white text-sm font-body pointer-events-none">
        {afterLabel}
      </div>
    </div>
  );
}
