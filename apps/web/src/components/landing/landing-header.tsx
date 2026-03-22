import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LandingHeaderProps {
  className?: string;
  onCtaClick?: () => void;
}

export function LandingHeader({ className, onCtaClick }: LandingHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "transition-all duration-500 ease-out",
        scrolled
          ? "bg-cream/80 backdrop-blur-xl shadow-[0_1px_0_rgba(26,23,20,0.06)]"
          : "bg-transparent",
        "safe-top",
        className,
      )}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="BabyPeek" className="h-7 w-7 sm:h-8 sm:w-8" />
          <span className="font-display text-xl sm:text-2xl text-charcoal font-medium tracking-wide">
            BabyPeek
          </span>
        </div>

        <button
          onClick={onCtaClick}
          className={cn(
            "hidden sm:flex items-center gap-2",
            "px-6 py-2.5 rounded-full",
            "font-body text-sm font-medium tracking-wide",
            "transition-all duration-300",
            scrolled
              ? "bg-coral text-white shadow-md hover:bg-coral-hover hover:shadow-lg"
              : "bg-charcoal/5 text-charcoal hover:bg-charcoal/10",
          )}
        >
          Try it free
        </button>
      </div>
    </header>
  );
}
