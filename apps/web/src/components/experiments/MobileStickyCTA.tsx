import { useEffect, useState, useRef } from "react";
import { posthog } from "@/lib/posthog";
import { cn } from "@/lib/utils";
import { useExperiment } from "@/hooks/use-experiment";
import { scheduleIdleTask } from "@/lib/browser-idle";

type StickyCTAVariant =
  | "sticky_free_preview"
  | "sticky_with_arrow"
  | "sticky_with_countdown";

const FALLBACK_VARIANT: StickyCTAVariant = "sticky_free_preview";

function isStickyCTAVariant(variant: string): variant is StickyCTAVariant {
  return (
    variant === "sticky_free_preview" ||
    variant === "sticky_with_arrow" ||
    variant === "sticky_with_countdown"
  );
}

const ACTIVATION_IDLE_TIMEOUT_MS = 4000;

export function MobileStickyCTA() {
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (activated) return;

    const activate = () => {
      setActivated(true);
    };

    const cancelIdle = scheduleIdleTask(activate, {
      afterPaint: true,
      timeoutMs: ACTIVATION_IDLE_TIMEOUT_MS,
    });

    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener("pointerdown", activate, opts);
    window.addEventListener("touchstart", activate, opts);
    window.addEventListener("keydown", activate, opts);

    return () => {
      cancelIdle();
      window.removeEventListener("pointerdown", activate, opts);
      window.removeEventListener("touchstart", activate, opts);
      window.removeEventListener("keydown", activate, opts);
    };
  }, [activated]);

  if (!activated) return null;

  return <MobileStickyCTAActive />;
}

function MobileStickyCTAActive() {
  const { variant, isLoading } = useExperiment("sticky_cta_test");
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoadingTimedOut, setIsLoadingTimedOut] = useState(false);
  const [committedVariant, setCommittedVariant] = useState<StickyCTAVariant | null>(null);
  const [countdown, setCountdown] = useState(15 * 60);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTrackedShownRef = useRef(false);
  const candidateVariant =
    !isLoading && isStickyCTAVariant(variant)
      ? variant
      : isLoadingTimedOut
        ? FALLBACK_VARIANT
        : null;
  const effectiveVariant = committedVariant;

  useEffect(() => {
    if (!isLoading) {
      setIsLoadingTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsLoadingTimedOut(true);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading]);

  useEffect(() => {
    if (committedVariant || !candidateVariant) return;
    setCommittedVariant(candidateVariant);
  }, [candidateVariant, committedVariant]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile || !effectiveVariant || hasTrackedShownRef.current) return;

    hasTrackedShownRef.current = true;
    posthog?.capture("sticky_cta_shown", {
      device: "mobile",
      viewport_width: window.innerWidth,
      variant: effectiveVariant,
    });
  }, [effectiveVariant, isMobile]);

  useEffect(() => {
    const handleUploadStarted = () => {
      setIsVisible(false);
      posthog?.capture("sticky_cta_hidden_on_upload");
    };

    window.addEventListener("babypeek:upload_started", handleUploadStarted);

    const uploadSection = document.getElementById("upload");
    if (!uploadSection)
      return () => window.removeEventListener("babypeek:upload_started", handleUploadStarted);
    if (typeof IntersectionObserver === "undefined") {
      return () => window.removeEventListener("babypeek:upload_started", handleUploadStarted);
    }

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

  useEffect(() => {
    if (effectiveVariant !== "sticky_with_countdown") return;

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
  }, [effectiveVariant]);

  if (!effectiveVariant) return null;
  if (!isMobile) return null;
  if (!isVisible) return null;

  const handleClick = () => {
    posthog?.capture("sticky_cta_clicked", {
      device: "mobile",
      scroll_position: window.scrollY,
      variant: effectiveVariant,
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
      {effectiveVariant === "sticky_with_arrow" && (
        <style>{`
          @keyframes cta-bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(6px); }
          }
        `}</style>
      )}

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
          type="button"
          aria-label="Start free preview by uploading your ultrasound"
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
          {effectiveVariant === "sticky_free_preview" && (
            <>
              <span className="text-2xl">👶</span>
              <span>Start FREE Preview</span>
            </>
          )}

          {effectiveVariant === "sticky_with_arrow" && (
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

          {effectiveVariant === "sticky_with_countdown" && (
            <>
              <span className="text-2xl">⏰</span>
              <span>See Your Baby Now</span>
              <span className="ml-1 text-base font-normal opacity-90">
                {formatCountdown(countdown)}
              </span>
            </>
          )}
        </button>

        {effectiveVariant === "sticky_free_preview" && (
          <p className="text-center text-xs text-warm-gray mt-2">
            See results before you pay
          </p>
        )}
        {effectiveVariant === "sticky_with_arrow" && (
          <p className="text-center text-xs text-warm-gray mt-2">
            Free preview &bull; No credit card needed
          </p>
        )}
        {effectiveVariant === "sticky_with_countdown" && (
          <p className="text-center text-xs text-warm-gray mt-2">
            {countdown > 0
              ? `${formatCountdown(countdown)} of free previews left`
              : "Hurry! Free previews ending soon"}
          </p>
        )}
      </div>

      <div className="h-28 md:hidden" aria-hidden="true" />
    </>
  );
}

export default MobileStickyCTA;
