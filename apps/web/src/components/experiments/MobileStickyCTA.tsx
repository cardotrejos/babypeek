import { useEffect, useState, useRef } from "react";
import { posthog } from "@/lib/posthog";
import { cn } from "@/lib/utils";
import { useExperiment } from "@/hooks/use-experiment";

/**
 * Mobile Sticky CTA - A/B Experiment
 *
 * Shows a large, sticky upload button at the bottom of the screen on mobile devices.
 * Variant rendering is controlled by PostHog feature flag `sticky_cta_test`.
 *
 * Variants:
 * - control: no sticky CTA (returns null)
 * - sticky_free_preview: "Start FREE Preview" + subtitle
 * - sticky_with_arrow: bouncing arrow animation
 * - sticky_with_countdown: countdown timer ("15 minutes of free previews left")
 *
 * Experiment: sticky_cta_test
 * Expected lift: 2-4x upload conversion
 */
export function MobileStickyCTA() {
  const { variant, isLoading } = useExperiment("sticky_cta_test");
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [countdown, setCountdown] = useState(15 * 60);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    if (isMobile && variant !== "control") {
      posthog?.capture("sticky_cta_shown", {
        device: "mobile",
        viewport_width: window.innerWidth,
        variant,
      });
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, [isMobile, variant]);

  // Hide sticky CTA when upload section is visible or upload starts
  useEffect(() => {
    const handleUploadStarted = () => {
      setIsVisible(false);
      posthog?.capture("sticky_cta_hidden_on_upload");
    };

    window.addEventListener("babypeek:upload_started", handleUploadStarted);

    const uploadSection = document.getElementById("upload");
    if (!uploadSection)
      return () => window.removeEventListener("babypeek:upload_started", handleUploadStarted);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(false);
          posthog?.capture("sticky_cta_hidden_on_scroll");
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(uploadSection);

    return () => {
      window.removeEventListener("babypeek:upload_started", handleUploadStarted);
      observer.disconnect();
    };
  }, []);

  // Countdown timer (only for sticky_with_countdown variant)
  useEffect(() => {
    if (variant !== "sticky_with_countdown") return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [variant]);

  // Early returns AFTER all hooks
  if (isLoading || variant === "control") return null;
  if (!isMobile) return null;
  if (!isVisible) return null;

  const handleClick = () => {
    posthog?.capture("sticky_cta_clicked", {
      device: "mobile",
      scroll_position: window.scrollY,
      variant,
    });

    const uploadSection = document.getElementById("upload");
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const formatCountdown = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* Bounce animation for arrow variant */}
      {variant === "sticky_with_arrow" && (
        <style>{`
          @keyframes cta-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(6px); }
          }
        `}</style>
      )}

      {/* Fixed CTA at bottom of screen */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "p-4 pb-6 bg-white/95 backdrop-blur-sm",
          "border-t border-warm-gray/20",
          "shadow-[0_-4px_20px_rgba(0,0,0,0.1)]",
          "safe-bottom-min",
        )}
      >
        <button
          onClick={handleClick}
          className={cn(
            "w-full h-16",
            "bg-gradient-to-r from-coral to-pink-500",
            "text-white text-xl font-bold",
            "rounded-full shadow-lg",
            "active:scale-[0.98] transition-transform",
            "flex items-center justify-center gap-2",
          )}
        >
          {variant === "sticky_free_preview" && (
            <>
              <span className="text-2xl">👶</span>
              <span>Start FREE Preview</span>
            </>
          )}

          {variant === "sticky_with_arrow" && (
            <>
              <span>See Your Baby Now</span>
              <span
                className="text-2xl"
                style={{ animation: "cta-bounce 1s ease-in-out infinite" }}
              >
                ↓
              </span>
            </>
          )}

          {variant === "sticky_with_countdown" && (
            <>
              <span className="text-2xl">⏰</span>
              <span>See Your Baby Now</span>
              <span className="ml-1 text-base font-normal opacity-90">
                {formatCountdown(countdown)}
              </span>
            </>
          )}
        </button>

        {variant === "sticky_free_preview" && (
          <p className="text-center text-xs text-warm-gray mt-2">
            See results before you pay
          </p>
        )}
        {variant === "sticky_with_arrow" && (
          <p className="text-center text-xs text-warm-gray mt-2">
            Free preview &bull; No credit card needed
          </p>
        )}
        {variant === "sticky_with_countdown" && (
          <p className="text-center text-xs text-warm-gray mt-2">
            {countdown > 0
              ? `${formatCountdown(countdown)} of free previews left`
              : "Hurry! Free previews ending soon"}
          </p>
        )}
      </div>

      {/* Spacer to prevent content from being hidden behind sticky CTA */}
      <div className="h-28 md:hidden" aria-hidden="true" />
    </>
  );
}

export default MobileStickyCTA;
