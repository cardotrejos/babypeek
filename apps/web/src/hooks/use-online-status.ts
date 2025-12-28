import { useState, useEffect, useCallback } from "react";

/**
 * Hook to track the user's online/offline status.
 *
 * Uses the Navigator.onLine API and listens for online/offline events.
 *
 * @returns Object with isOnline status and a function to check current status
 */
export function useOnlineStatus() {
  // Initialize with current online status (true for SSR)
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  // Force check the current status
  const checkStatus = useCallback(() => {
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
      return navigator.onLine;
    }
    return true;
  }, []);

  useEffect(() => {
    // Skip if not in browser
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Sync with current state on mount
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOnline,
    checkStatus,
  };
}
