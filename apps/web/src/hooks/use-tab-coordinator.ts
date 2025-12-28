import { useEffect, useState, useCallback, useRef } from "react";
import {
  createTabCoordinator,
  isBroadcastChannelSupported,
  type StatusUpdate,
} from "@/lib/tab-coordinator";

/**
 * Hook for tab coordination (Story 5.7: AC8)
 *
 * Ensures only one tab polls for status updates.
 * Other tabs receive updates via BroadcastChannel.
 *
 * @param jobId - The job ID to coordinate
 * @param options.enabled - Whether coordination should be active
 * @returns Tab coordination state and methods
 */
export function useTabCoordinator(jobId: string | null, options?: { enabled?: boolean }) {
  const { enabled = true } = options ?? {};
  const [isLeader, setIsLeader] = useState(!isBroadcastChannelSupported());
  const [statusUpdate, setStatusUpdate] = useState<StatusUpdate | null>(null);
  const [refetchRequested, setRefetchRequested] = useState(0);
  const coordinatorRef = useRef<ReturnType<typeof createTabCoordinator> | null>(null);

  // Broadcast a status update to other tabs
  const broadcast = useCallback((status: StatusUpdate) => {
    coordinatorRef.current?.broadcast(status);
  }, []);

  // Request the leader tab to refetch status now
  const requestRefetch = useCallback(() => {
    coordinatorRef.current?.requestRefetch();
  }, []);

  useEffect(() => {
    // Skip if disabled, no jobId, or SSR
    if (!enabled || !jobId || typeof window === "undefined") {
      // When disabled, act as leader (single tab behavior)
      setIsLeader(true);
      return;
    }

    // If BroadcastChannel not supported, act as leader
    if (!isBroadcastChannelSupported()) {
      setIsLeader(true);
      return;
    }

    const coordinator = createTabCoordinator(
      jobId,
      () => setIsLeader(true), // onBecomeLeader
      () => setIsLeader(false), // onLoseLeadership
    );

    coordinatorRef.current = coordinator;

    // Initially check if we're leader
    setIsLeader(coordinator.isLeader);

    // Listen for status updates from leader tab
    const unsubscribeStatus = coordinator.onStatusUpdate((status) => {
      setStatusUpdate(status);
    });

    // Listen for refetch requests (only leader should receive these)
    const unsubscribeRefetch = coordinator.onRefetchRequest(() => {
      setRefetchRequested((n) => n + 1);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeRefetch();
      coordinator.close();
      coordinatorRef.current = null;
    };
  }, [enabled, jobId]);

  return {
    /**
     * Whether this tab is the leader (should poll)
     */
    isLeader,

    /**
     * Whether BroadcastChannel is supported
     */
    isSupported: isBroadcastChannelSupported(),

    /**
     * Latest status update received from leader (if not leader)
     */
    statusUpdate,

    /**
     * Incrementing counter when leader receives a refetch request
     */
    refetchRequested,

    /**
     * Broadcast a status update to other tabs (only works if leader)
     */
    broadcast,

    /**
     * Ask the leader tab to refetch status now
     */
    requestRefetch,
  };
}
