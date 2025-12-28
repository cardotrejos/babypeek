import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createTabCoordinator,
  isBroadcastChannelSupported,
  type StatusUpdate,
} from "./tab-coordinator";

describe("tab-coordinator", () => {
  let originalBroadcastChannel: typeof BroadcastChannel | undefined;

  beforeEach(() => {
    originalBroadcastChannel = (
      globalThis as unknown as { BroadcastChannel: typeof BroadcastChannel }
    ).BroadcastChannel;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalBroadcastChannel) {
      (globalThis as unknown as { BroadcastChannel: typeof BroadcastChannel }).BroadcastChannel =
        originalBroadcastChannel;
    }
  });

  describe("isBroadcastChannelSupported", () => {
    it("returns true when BroadcastChannel is available", () => {
      // In jsdom, BroadcastChannel should be available
      expect(typeof BroadcastChannel).toBe("function");
      expect(isBroadcastChannelSupported()).toBe(true);
    });
  });

  describe("createTabCoordinator", () => {
    it("creates coordinator with leader election", async () => {
      const onBecomeLeader = vi.fn();
      const coordinator = createTabCoordinator("job-123", onBecomeLeader);

      // Wait for initial leader claim timeout
      await vi.advanceTimersByTimeAsync(600);

      // Should become leader since no other tabs
      expect(coordinator.isLeader).toBe(true);
      expect(onBecomeLeader).toHaveBeenCalled();

      coordinator.close();
    });

    it("does not become leader after close (cleans up leader claim timeout)", async () => {
      const onBecomeLeader = vi.fn();
      const coordinator = createTabCoordinator("job-123", onBecomeLeader);

      // Close immediately before leader claim timeout fires
      coordinator.close();

      await vi.advanceTimersByTimeAsync(600);

      expect(onBecomeLeader).not.toHaveBeenCalled();
    });

    it("broadcasts status updates when leader", async () => {
      const coordinator = createTabCoordinator("job-123");

      // Wait to become leader
      await vi.advanceTimersByTimeAsync(600);

      const status: StatusUpdate = {
        jobId: "job-123",
        status: "processing",
        progress: 50,
      };

      // Should not throw
      expect(() => coordinator.broadcast(status)).not.toThrow();

      coordinator.close();
    });

    it("executes refetch callbacks when leader receives a refetch request", async () => {
      const coordinator = createTabCoordinator("job-123");

      await vi.advanceTimersByTimeAsync(600);

      const onRefetch = vi.fn();
      const unsubscribe = coordinator.onRefetchRequest(onRefetch);

      // If we're leader, requestRefetch executes locally
      coordinator.requestRefetch();

      expect(onRefetch).toHaveBeenCalledTimes(1);

      unsubscribe();
      coordinator.close();
    });

    it("registers status update callbacks", async () => {
      const coordinator = createTabCoordinator("job-123");
      const callback = vi.fn();

      const unsubscribe = coordinator.onStatusUpdate(callback);

      // Should be able to unsubscribe
      expect(typeof unsubscribe).toBe("function");

      unsubscribe();
      coordinator.close();
    });

    it("cleans up on close", async () => {
      const coordinator = createTabCoordinator("job-123");

      await vi.advanceTimersByTimeAsync(600);

      // Should not throw
      expect(() => coordinator.close()).not.toThrow();

      // Multiple closes should be safe
      expect(() => coordinator.close()).not.toThrow();
    });
  });

  describe("fallback behavior", () => {
    it("returns leader=true when BroadcastChannel is unavailable", () => {
      // Remove BroadcastChannel
      const originalBC = globalThis.BroadcastChannel;
      // @ts-expect-error - intentionally removing for test
      globalThis.BroadcastChannel = undefined;

      // Need to re-import to test fallback (or test the function directly)
      // Since we can't easily re-import, test the function behavior
      const result = isBroadcastChannelSupported();
      expect(result).toBe(false);

      // Restore
      globalThis.BroadcastChannel = originalBC;
    });

    it("coordinator works without BroadcastChannel", () => {
      // Remove BroadcastChannel
      const originalBC = globalThis.BroadcastChannel;
      // @ts-expect-error - intentionally removing for test
      globalThis.BroadcastChannel = undefined;

      const coordinator = createTabCoordinator("job-123");

      // Should return fallback that is always leader
      expect(coordinator.isLeader).toBe(true);

      // Operations should be no-ops
      coordinator.broadcast({ jobId: "job-123", status: "done" });
      coordinator.requestRefetch();
      const unsubRefetch = coordinator.onRefetchRequest(() => {});
      const unsub = coordinator.onStatusUpdate(() => {});
      unsub();
      unsubRefetch();
      coordinator.close();

      // Restore
      globalThis.BroadcastChannel = originalBC;
    });
  });
});
