import { useState, useEffect, useCallback, useRef } from "react";

import { API_BASE_URL } from "@/lib/api-config";

const CONNECTIVITY_DEBOUNCE_MS = 750;
const STATUS_FLAP_COOLDOWN_MS = 2500;
const HEALTH_CHECK_TIMEOUT_MS = 3500;
const HEALTH_CHECK_URL = `${API_BASE_URL}/api/health`;

/**
 * Hook to track the user's online/offline status.
 *
 * Uses a health-check request because navigator.onLine is unreliable on mobile.
 * Status changes are debounced and cooled down to avoid rapid UI flapping.
 *
 * @returns Object with isOnline status and an async function to verify current status
 */
export function useOnlineStatus() {
  // Use navigator as an initial hint only (verified by health check after mount)
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  const statusRef = useRef<boolean>(isOnline);
  const lastStatusChangeAtRef = useRef<number>(0);
  const debounceTimerRef = useRef<number | null>(null);
  const healthCheckAbortRef = useRef<AbortController | null>(null);

  const setStatus = useCallback((nextStatus: boolean, respectCooldown: boolean = true) => {
    const now = Date.now();
    const currentStatus = statusRef.current;
    const isTransition = nextStatus !== currentStatus;

    if (
      isTransition &&
      respectCooldown &&
      now - lastStatusChangeAtRef.current < STATUS_FLAP_COOLDOWN_MS
    ) {
      return;
    }

    if (isTransition) {
      statusRef.current = nextStatus;
      lastStatusChangeAtRef.current = now;
    }

    setIsOnline(nextStatus);
  }, []);

  const verifyConnectivity = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") {
      return true;
    }

    if (healthCheckAbortRef.current) {
      healthCheckAbortRef.current.abort();
    }

    const controller = new AbortController();
    healthCheckAbortRef.current = controller;

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, HEALTH_CHECK_TIMEOUT_MS);

    try {
      const response = await fetch(HEALTH_CHECK_URL, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timeoutId);
      if (healthCheckAbortRef.current === controller) {
        healthCheckAbortRef.current = null;
      }
    }
  }, []);

  // Force check the current status with a real connectivity probe
  const checkStatus = useCallback(async (): Promise<boolean> => {
    const connected = await verifyConnectivity();
    setStatus(connected, false);
    return connected;
  }, [setStatus, verifyConnectivity]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const scheduleStatusCheck = () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        void (async () => {
          const connected = await verifyConnectivity();
          setStatus(connected, true);
        })();
      }, CONNECTIVITY_DEBOUNCE_MS);
    };

    const handleOnline = () => scheduleStatusCheck();
    const handleOffline = () => scheduleStatusCheck();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Verify immediately on mount (skip cooldown for first truthy state sync)
    void (async () => {
      const connected = await verifyConnectivity();
      setStatus(connected, false);
    })();

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }

      if (healthCheckAbortRef.current) {
        healthCheckAbortRef.current.abort();
      }

      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setStatus, verifyConnectivity]);

  return {
    isOnline,
    checkStatus,
  };
}
