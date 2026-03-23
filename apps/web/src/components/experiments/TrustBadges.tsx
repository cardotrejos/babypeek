import { useEffect, useRef } from "react";
import { posthog } from "@/lib/posthog";
import { cn } from "@/lib/utils";
import { useExperiment } from "@/hooks/use-experiment";

export interface TrustBadgesProps {
  className?: string;
}

export function TrustBadges({ className }: TrustBadgesProps) {
  const { variant, isLoading } = useExperiment("trust_badges_test");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoading) return;

    const fireExposure = () => {
      posthog?.capture("trust_badges_shown", { variant });
    };

    if (typeof IntersectionObserver === "undefined") {
      fireExposure();
      return;
    }

    const el = rootRef.current;
    if (!el) {
      fireExposure();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fireExposure();
          observer.disconnect();
        }
      },
      { rootMargin: "160px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [variant, isLoading]);

  const badges = [
    {
      emoji: "🔒",
      text: "100% Private & Secure",
      subtext: "Images auto-deleted after 30 days",
    },
    {
      emoji: "⚡",
      text: "Results in 60 Seconds",
      subtext: "AI-powered instant processing",
    },
    {
      emoji: "💯",
      text: "10,000+ Happy Parents",
      subtext: "Trusted by families worldwide",
    },
  ];

  return (
    <div ref={rootRef} className={cn("py-6", className)}>
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
