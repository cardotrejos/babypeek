import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, type ReactNode } from "react";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com";
const POSTHOG_AUTOCAPTURE = import.meta.env.VITE_POSTHOG_AUTOCAPTURE;
const POSTHOG_SESSION_RECORDING = import.meta.env.VITE_POSTHOG_SESSION_RECORDING;

function isEnabled(raw: string | undefined): boolean {
  return raw === "true" || raw === "1";
}

let isInitialized = false;

export function getPostHogInitOptions() {
  const autocaptureOn = isEnabled(POSTHOG_AUTOCAPTURE);
  const sessionRecordingOn = isEnabled(POSTHOG_SESSION_RECORDING);

  return {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: autocaptureOn,
    autocapture: autocaptureOn,
    persistence: "localStorage" as const,
    respect_dnt: true,
    disable_session_recording: !sessionRecordingOn,
    session_recording: sessionRecordingOn
      ? {
          maskAllInputs: true,
          recordCrossOriginIframes: false,
        }
      : undefined,
  };
}

function initPostHog() {
  if (isInitialized || typeof window === "undefined" || !POSTHOG_KEY) {
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      ...getPostHogInitOptions(),
      loaded: () => {
        if (import.meta.env.DEV) {
          console.log("📊 PostHog initialized");
        }
      },
    });

    isInitialized = true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("PostHog initialization failed:", error);
    }
  }
}

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    initPostHog();
  }, []);

  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) {
      console.log("📊 PostHog not configured (VITE_POSTHOG_KEY missing)");
    }
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export { posthog };

export const isPostHogConfigured = () => !!POSTHOG_KEY;
