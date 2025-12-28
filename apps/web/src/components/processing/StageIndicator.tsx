import { cn } from "@/lib/utils";

interface Stage {
  id: string;
  label: string;
  icon: string;
}

const stages: Stage[] = [
  { id: "analyzing", label: "Analyzing", icon: "🔍" },
  { id: "creating", label: "Creating", icon: "✨" },
  { id: "finishing", label: "Finishing", icon: "🎨" },
];

interface StageIndicatorProps {
  currentStep: number;
  className?: string;
}

/**
 * 3-stage progress indicator showing: Analyzing → Creating → Finishing
 */
export function StageIndicator({ currentStep, className }: StageIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 sm:gap-4", className)}>
      {stages.map((stage, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isComplete = stepNum < currentStep;

        return (
          <div key={stage.id} className="flex items-center">
            {/* Stage indicator */}
            <div
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full transition-all duration-300",
                isActive && "bg-coral text-white scale-105 shadow-md",
                isComplete && "bg-coral/20 text-coral",
                !isActive && !isComplete && "bg-charcoal/5 text-warm-gray",
              )}
            >
              <span className={cn("text-sm sm:text-base", isActive && "animate-pulse")}>
                {stage.icon}
              </span>
              <span className="font-body text-xs sm:text-sm whitespace-nowrap">{stage.label}</span>
            </div>

            {/* Connector line between stages */}
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "w-4 sm:w-8 h-0.5 mx-1 sm:mx-2 transition-colors duration-300",
                  stepNum < currentStep ? "bg-coral" : "bg-charcoal/10",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
