import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ProcessingStage } from "@/hooks/use-status";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { StageIndicator } from "./StageIndicator";
import { StageCopy } from "./StageCopy";
import { BabyFacts } from "./BabyFacts";
import { ImageSkeleton } from "./ImageSkeleton";
import { getUiStage } from "./stage-copy";

interface ProcessingScreenProps {
  stage: ProcessingStage;
  progress: number;
  isComplete: boolean;
  isFailed: boolean;
  className?: string;
}

/**
 * Full-featured processing status page with:
 * - 3-stage progress indicator (AC-1, AC-2)
 * - Stage-specific copy (AC-3)
 * - Baby facts carousel (AC-4)
 * - Skeleton loading (AC-5)
 * - Accessibility announcements (AC-6)
 * - Story 5.4: Reduced motion support
 *
 * Note: isComplete/isFailed props are passed for future use when transitioning
 * to reveal state. Currently the parent route handles state transitions.
 */
export function ProcessingScreen({
  stage,
  progress,
  isComplete,
  isFailed,
  className,
}: ProcessingScreenProps) {
  const { ui: uiStage, step: currentStep } = getUiStage(stage);
  const [prevStep, setPrevStep] = useState(currentStep);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Trigger animation when step changes
  useEffect(() => {
    if (currentStep !== prevStep) {
      setShouldAnimate(true);
      setPrevStep(currentStep);
      const timeout = setTimeout(() => setShouldAnimate(false), 500);
      return () => clearTimeout(timeout);
    }
  }, [currentStep, prevStep]);

  // Announce stage changes to screen readers (AC-6)
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (stage && !isComplete && !isFailed) {
      const stageLabels = {
        analyzing: "Analyzing your ultrasound",
        creating: "Creating your baby's portrait",
        finishing: "Adding final touches",
      };
      setAnnouncement(`Stage ${currentStep} of 3: ${stageLabels[uiStage]}`);
    }
  }, [stage, currentStep, uiStage, isComplete, isFailed]);

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center p-4 bg-cream relative overflow-hidden",
        className,
      )}
    >
      {/* Subtle background animation (disabled if prefers-reduced-motion) */}
      {!prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-coral/5 to-transparent animate-pulse-slow rounded-full" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-rose/10 to-transparent animate-pulse-slower rounded-full" />
        </div>
      )}

      <div className="relative z-10 max-w-xl w-full flex flex-col items-center gap-6">
        {/* Skip link for accessibility */}
        <a
          href="#processing-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-coral focus:text-white focus:rounded-lg"
        >
          Skip to main content
        </a>

        {/* Stage indicator (AC-1, AC-2) */}
        <StageIndicator
          currentStep={currentStep}
          className={cn(shouldAnimate && !prefersReducedMotion && "animate-bounce-subtle")}
        />

        {/* Progress bar with aria-label (AC-6) */}
        <div className="w-full max-w-md" id="processing-content">
          <div className="w-full bg-charcoal/10 rounded-full h-3 overflow-hidden">
            <div
              className={cn(
                "bg-coral h-full rounded-full",
                !prefersReducedMotion && "transition-all duration-500 ease-out",
              )}
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Processing ${progress}% complete, stage ${currentStep} of 3`}
            />
          </div>
          <p className="text-center text-sm text-warm-gray/70 mt-2 font-body">
            {progress}% complete
          </p>
        </div>

        {/* Stage-specific copy (AC-3) */}
        <StageCopy uiStage={uiStage} className="mt-2" />

        {/* Image skeleton placeholder (AC-5) */}
        <ImageSkeleton className="mt-4" />

        {/* Baby facts carousel (AC-4), static when reduced motion (5.4 AC-2) */}
        <BabyFacts className="mt-6" static={prefersReducedMotion} />

        {/* Accessibility: aria-live region for stage announcements (AC-6) */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>
      </div>
    </div>
  );
}
