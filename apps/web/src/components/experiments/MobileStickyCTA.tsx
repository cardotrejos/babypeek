import { useEffect, useState } from "react";
import { posthog } from "@/lib/posthog";
import { cn } from "@/lib/utils";

/**
 * Mobile Sticky CTA - A/B Experiment
 *
 * Shows a large, sticky upload button at the bottom of the screen on mobile devices.
 * This is designed to improve conversion by making the CTA always visible.
 *
 * Experiment: mobile-sticky-cta
 * Expected lift: 2-4x upload conversion
 */
export function MobileStickyCTA() {
  const [isMobile, setIsMobile] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if mobile device
    const checkMobile = () => {
      const mobile =
        window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Track that we showed the sticky CTA
    if (isMobile) {
      posthog?.capture("sticky_cta_shown", {
        device: "mobile",
        viewport_width: window.innerWidth,
      });
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, [isMobile]);

  // Hide sticky CTA when upload section is visible or upload starts
  useEffect(() => {
    const handleUploadStarted = () => {
      setIsVisible(false);
      posthog?.capture("sticky_cta_hidden_on_upload");
    };

    window.addEventListener("babypeek:upload_started", handleUploadStarted);

    // Also hide when upload section scrolls into view
    const uploadSection = document.getElementById("upload");
    if (!uploadSection) return () => window.removeEventListener("babypeek:upload_started", handleUploadStarted);

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

  // Don't show on desktop
  if (!isMobile) return null;

  // Allow hiding (e.g., when already uploading)
  if (!isVisible) return null;

  const handleClick = () => {
    posthog?.capture("sticky_cta_clicked", {
      device: "mobile",
      scroll_position: window.scrollY,
    });

    // Scroll to upload section
    const uploadSection = document.getElementById("upload");
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {/* Fixed CTA at bottom of screen */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "p-4 pb-6 bg-white/95 backdrop-blur-sm",
          "border-t border-warm-gray/20",
          "shadow-[0_-4px_20px_rgba(0,0,0,0.1)]",
          "safe-area-inset-bottom",
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
          <span className="text-2xl">👶</span>
          <span>See Your Baby Now</span>
        </button>
        <p className="text-center text-xs text-warm-gray mt-2">
          Free preview • No credit card needed
        </p>
      </div>

      {/* Spacer to prevent content from being hidden behind sticky CTA */}
      <div className="h-28 md:hidden" aria-hidden="true" />
    </>
  );
}

export default MobileStickyCTA;
