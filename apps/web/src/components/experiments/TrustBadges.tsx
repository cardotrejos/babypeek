import { useEffect } from "react";
import { ShieldCheckIcon, ZapIcon, HeartIcon } from "lucide-react";
import { posthog } from "@/lib/posthog";
import { cn } from "@/lib/utils";

/**
 * Trust Badges - A/B Experiment
 *
 * Shows trust signals near the upload section to reduce privacy concerns
 * and increase confidence in uploading personal ultrasound images.
 *
 * Experiment: trust-badges-test
 * Expected lift: 1-2x upload conversion
 */
export interface TrustBadgesProps {
  className?: string;
}

export function TrustBadges({ className }: TrustBadgesProps) {
  useEffect(() => {
    posthog?.capture("trust_badges_shown");
  }, []);

  const badges = [
    {
      icon: ShieldCheckIcon,
      emoji: "🔒",
      text: "100% Private & Secure",
      subtext: "Images auto-deleted after 30 days",
    },
    {
      icon: ZapIcon,
      emoji: "⚡",
      text: "Results in 60 Seconds",
      subtext: "AI-powered instant processing",
    },
    {
      icon: HeartIcon,
      emoji: "💯",
      text: "10,000+ Happy Parents",
      subtext: "Trusted by families worldwide",
    },
  ];

  return (
    <div className={cn("py-6", className)}>
      {/* Mobile: Horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto pb-2 sm:overflow-visible sm:flex-wrap sm:justify-center">
        {badges.map((badge, index) => (
          <div
            key={index}
            className={cn(
              "flex-shrink-0 flex items-center gap-3",
              "px-4 py-3 rounded-xl",
              "bg-cream/50 border border-warm-gray/20",
              "min-w-[200px] sm:min-w-0",
            )}
          >
            <span className="text-2xl">{badge.emoji}</span>
            <div>
              <p className="font-medium text-charcoal text-sm whitespace-nowrap">{badge.text}</p>
              <p className="text-xs text-warm-gray whitespace-nowrap">{badge.subtext}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TrustBadges;
