import { useState, useEffect } from "react";

/**
 * Hook to detect user's reduced motion preference
 * Story 5.4: Reduced Motion Support
 *
 * Returns true if user prefers reduced motion (accessibility setting)
 * Listens for changes so UI updates if user toggles setting at runtime
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // SSR safety check
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes (user can toggle setting)
    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}
