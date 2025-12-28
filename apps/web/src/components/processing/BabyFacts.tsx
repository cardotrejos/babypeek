import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const babyFacts = [
  "Your baby can hear your voice from inside the womb!",
  "Babies start dreaming before they're born.",
  "A baby's fingerprints form at 10 weeks.",
  "Babies can taste what you eat through the amniotic fluid.",
  "At 20 weeks, your baby is about the size of a banana.",
  "Babies practice breathing movements in the womb.",
  "Your baby has been making facial expressions since 14 weeks.",
  "Newborns can recognize their mother's voice immediately.",
  "Babies can see light through the womb by 15 weeks.",
  "Your baby yawns and stretches just like you do!",
  "A baby's heart beats about 150 times per minute.",
  "Babies can hiccup in the womb from the second trimester.",
  "Your baby's tiny hands can grip from 25 weeks.",
  "Babies sleep about 17 hours a day in the womb.",
  "Your baby's first poop happens in the womb!",
  "Babies respond to music and will even dance in the womb.",
  "Your baby's brain develops 250,000 neurons every minute.",
  "Babies can smell through the amniotic fluid.",
];

interface BabyFactsProps {
  className?: string;
  /** When true, disables rotation and shows static fact (Story 5.4: reduced motion) */
  static?: boolean;
}

/**
 * Rotating carousel of fun baby facts to engage users during processing wait
 * Story 5.4: Supports static mode for reduced motion preference
 */
export function BabyFacts({ className, static: isStatic }: BabyFactsProps) {
  const [currentFact, setCurrentFact] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Rotate facts every 10 seconds with fade animation (disabled when static)
  useEffect(() => {
    if (isStatic) return; // Don't rotate when static (5.4 AC-2)

    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentFact((prev) => (prev + 1) % babyFacts.length);
        setIsVisible(true);
      }, 300);
    }, 10000);

    return () => clearInterval(interval);
  }, [isStatic]);

  return (
    <div className={cn("p-4 bg-rose/30 rounded-xl max-w-md text-center", className)}>
      <p className="text-sm text-warm-gray font-body">💡 Did you know?</p>
      <p
        className={cn(
          "text-charcoal font-body mt-2",
          // Skip transition animation when static (5.4 AC-2)
          !isStatic && "transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0",
        )}
      >
        {babyFacts[currentFact]}
      </p>
    </div>
  );
}
