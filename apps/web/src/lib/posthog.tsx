import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, type ReactNode } from "react";

// PostHog configuration
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com";

// Initialize PostHog only once
let isInitialized = false;

function initPostHog() {
  if (isInitialized || typeof window === "undefined" || !POSTHOG_KEY) {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    persistence: "localStorage",
    // Respect Do Not Track
    respect_dnt: true,

    // 🎥 SESSION RECORDINGS - See exactly where users drop off!
    disable_session_recording: false,
    session_recording: {
      // Privacy: mask all form inputs (emails, etc.)
      maskAllInputs: true,
      // Record console logs for debugging
      recordCrossOriginIframes: false,
    },

    // Disable in development if no key
    loaded: () => {
      if (import.meta.env.DEV) {
        console.log("📊 PostHog initialized with session recordings");
      }
    },
  });

  isInitialized = true;
}

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    initPostHog();
  }, []);

  // If no PostHog key, just render children without provider
  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) {
      console.log("📊 PostHog not configured (VITE_POSTHOG_KEY missing)");
    }
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// Export posthog instance for direct access if needed
export { posthog };

// Check if PostHog is configured
export const isPostHogConfigured = () => !!POSTHOG_KEY;
