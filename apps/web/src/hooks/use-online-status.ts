import { useState, useEffect, useCallback, useRef } from "react";

import { API_BASE_URL } from "@/lib/api-config";

const CONNECTIVITY_DEBOUNCE_MS = 750;
const STATUS_FLAP_COOLDOWN_MS = 2500;
const HEALTH_CHECK_TIMEOUT_MS = 3500;
const HEALTH_CHECK_DEDUPE_WINDOW_MS = 2000;
const HEALTH_CHECK_URL = `${API_BASE_URL}/api/health`;

type SharedHealthCheckState = {
  inFlightPromise: Promise<boolean> | null;
  lastCheckedAt: number;
  lastResult: boolean | null;
  lastFetchRef: typeof fetch | null;
};

const sharedHealthCheckState: SharedHealthCheckState = {
  inFlightPromise: null,
  lastCheckedAt: 0,
  lastResult: null,
  lastFetchRef: null,
};

async function runSharedHealthCheck(useRecentResult: boolean = false): Promise<boolean> {
  if (typeof window === "undefined") {
    return true;
  }

  if (sharedHealthCheckState.inFlightPromise) {
    return sharedHealthCheckState.inFlightPromise;
  }

  const now = Date.now();
  const hasFreshResult =
    useRecentResult &&
    sharedHealthCheckState.lastResult !== null &&
    now - sharedHealthCheckState.lastCheckedAt < HEALTH_CHECK_DEDUPE_WINDOW_MS &&
    sharedHealthCheckState.lastFetchRef === fetch;

  if (hasFreshResult) {
    return sharedHealthCheckState.lastResult ?? false;
  }

  const fetchRef = fetch;
  sharedHealthCheckState.lastFetchRef = fetchRef;

  sharedHealthCheckState.inFlightPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, HEALTH_CHECK_TIMEOUT_MS);

    let nextStatus = false;
    try {
      const response = await fetchRef(HEALTH_CHECK_URL, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });

      nextStatus = response.ok;
      return nextStatus;
    } catch {
      return nextStatus;
    } finally {
      window.clearTimeout(timeoutId);
      sharedHealthCheckState.lastCheckedAt = Date.now();
      sharedHealthCheckState.lastResult = nextStatus;
      sharedHealthCheckState.inFlightPromise = null;
    }
  })();

  return sharedHealthCheckState.inFlightPromise;
}

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

  const verifyConnectivity = useCallback(async (useRecentResult: boolean = false): Promise<boolean> => {
    return runSharedHealthCheck(useRecentResult);
  }, []);

  // Force check the current status with a real connectivity probe
  const checkStatus = useCallback(async (): Promise<boolean> => {
    const connected = await verifyConnectivity(false);
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
          const connected = await verifyConnectivity(false);
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
      const connected = await verifyConnectivity(true);
      setStatus(connected, false);
    })();

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
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
