import { useState, useEffect, useRef } from "react";
import { posthog, isPostHogConfigured } from "@/lib/posthog";

const SESSION_KEY_PREFIX = "bp_experiment_tracked_";

function safeSessionStorage(action: "get" | "set", key: string, value?: string): string | null {
  try {
    if (action === "get") return sessionStorage.getItem(key);
    if (action === "set" && value !== undefined) sessionStorage.setItem(key, value);
  } catch {
    // sessionStorage unavailable (private browsing, storage disabled)
  }
  return null;
}

export function useExperiment(experimentName: string): {
  variant: string;
  isLoading: boolean;
} {
  const [variant, setVariant] = useState<string>("control");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const hasTracked = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !isPostHogConfigured()) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = posthog.onFeatureFlags(() => {
      const flagValue = posthog.getFeatureFlag(experimentName);
      const resolvedVariant =
        typeof flagValue === "string" ? flagValue : "control";

      setVariant(resolvedVariant);
      setIsLoading(false);

      // Track variant exposure once per session per experiment
      const sessionKey = SESSION_KEY_PREFIX + experimentName;
      const alreadyTracked =
        hasTracked.current ||
        safeSessionStorage("get", sessionKey) === resolvedVariant;

      if (!alreadyTracked) {
        posthog.capture("ab_test_variant_shown", {
          test_name: experimentName,
          variant: resolvedVariant,
        });
        safeSessionStorage("set", sessionKey, resolvedVariant);
        hasTracked.current = true;
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [experimentName]);

  return { variant, isLoading };
}
