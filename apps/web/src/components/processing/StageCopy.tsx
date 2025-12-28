import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getStageCopy, type UiStage } from "./stage-copy";

interface StageCopyProps {
  uiStage: UiStage;
  className?: string;
}

/**
 * Displays stage-specific copy with rotating sub-text
 */
export function StageCopy({ uiStage, className }: StageCopyProps) {
  const copy = getStageCopy(uiStage);
  const [subIndex, setSubIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Rotate sub-copy every 4 seconds with fade animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setSubIndex((prev) => (prev + 1) % copy.sub.length);
        setIsVisible(true);
      }, 200);
    }, 4000);

    return () => clearInterval(interval);
  }, [copy.sub.length]);

  // Reset sub index when stage changes
  useEffect(() => {
    setSubIndex(0);
    setIsVisible(true);
  }, [uiStage]);

  return (
    <div className={cn("text-center space-y-2", className)}>
      <h1 className="font-display text-2xl sm:text-3xl text-charcoal">{copy.main}</h1>
      <p
        className={cn(
          "font-body text-warm-gray transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0",
        )}
      >
        {copy.sub[subIndex]}
      </p>
    </div>
  );
}
