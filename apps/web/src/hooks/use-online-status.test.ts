import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useOnlineStatus } from "./use-online-status";

describe("useOnlineStatus", () => {
  const originalNavigator = global.navigator;
  const originalFetch = global.fetch;

  const setNavigatorOnline = (value: boolean) => {
    Object.defineProperty(global.navigator, "onLine", {
      value,
      configurable: true,
    });
  };

  const mockHealthCheckSuccess = () => ({ ok: true } as Response);

  const flushMicrotasks = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  const advanceTime = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock navigator.onLine
    Object.defineProperty(global, "navigator", {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });

    global.fetch = vi.fn().mockResolvedValue(mockHealthCheckSuccess());
  });

  afterEach(() => {
    vi.useRealTimers();

    // Restore original navigator
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
    });

    global.fetch = originalFetch;
  });

  describe("Initial State", () => {
    it("uses health check fallback when navigator reports online but connectivity fails", async () => {
      setNavigatorOnline(true);
      global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

      const { result } = renderHook(() => useOnlineStatus());

      await flushMicrotasks();

      expect(result.current.isOnline).toBe(false);
    });

    it("uses health check fallback when navigator reports offline but connectivity works", async () => {
      setNavigatorOnline(false);
      global.fetch = vi.fn().mockResolvedValue(mockHealthCheckSuccess());

      const { result } = renderHook(() => useOnlineStatus());

      await flushMicrotasks();

      expect(result.current.isOnline).toBe(true);
    });
  });

  describe("Online/Offline Events", () => {
    it("debounces rapid online/offline events", async () => {
      const { result } = renderHook(() => useOnlineStatus());
      await flushMicrotasks();

      expect(result.current.isOnline).toBe(true);

      act(() => {
        setNavigatorOnline(false);
        window.dispatchEvent(new Event("offline"));
        setNavigatorOnline(true);
        window.dispatchEvent(new Event("online"));
      });

      // Should remain unchanged until debounce window passes
      expect(result.current.isOnline).toBe(true);

      await advanceTime(1000);

      expect(result.current.isOnline).toBe(true);
    });

    it("applies cooldown to avoid rapid status flapping", async () => {
      const fetchMock = vi
        .fn()
        // Initial mount check
        .mockResolvedValueOnce(mockHealthCheckSuccess())
        // Offline event check
        .mockRejectedValueOnce(new Error("offline"))
        // Online event check (within cooldown)
        .mockResolvedValueOnce(mockHealthCheckSuccess())
        // Online event check (after cooldown)
        .mockResolvedValueOnce(mockHealthCheckSuccess());
      global.fetch = fetchMock;

      const { result } = renderHook(() => useOnlineStatus());
      await flushMicrotasks();

      expect(result.current.isOnline).toBe(true);

      act(() => {
        setNavigatorOnline(false);
        window.dispatchEvent(new Event("offline"));
      });

      await advanceTime(1000);
      expect(result.current.isOnline).toBe(false);

      act(() => {
        setNavigatorOnline(true);
        window.dispatchEvent(new Event("online"));
      });

      await advanceTime(1000);
      expect(result.current.isOnline).toBe(false);

      await advanceTime(3000);

      act(() => {
        window.dispatchEvent(new Event("online"));
      });

      await advanceTime(1000);
      expect(result.current.isOnline).toBe(true);
    });
  });

  describe("checkStatus", () => {
    it("returns verified connectivity status", async () => {
      setNavigatorOnline(true);
      global.fetch = vi.fn().mockRejectedValue(new Error("offline"));

      const { result } = renderHook(() => useOnlineStatus());
      await flushMicrotasks();

      let checkedStatus = true;
      await act(async () => {
        checkedStatus = await result.current.checkStatus();
      });

      expect(checkedStatus).toBe(false);
      expect(result.current.isOnline).toBe(false);
    });

    it("can recover to online when connectivity is restored", async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("offline"))
        .mockResolvedValueOnce(mockHealthCheckSuccess());
      global.fetch = fetchMock;

      const { result } = renderHook(() => useOnlineStatus());
      await flushMicrotasks();

      act(() => {
        setNavigatorOnline(true);
      });

      let checkedStatus = false;
      await act(async () => {
        checkedStatus = await result.current.checkStatus();
      });

      expect(checkedStatus).toBe(true);
      expect(result.current.isOnline).toBe(true);
    });
  });

  describe("Cleanup", () => {
    it("should remove event listeners on unmount", () => {
      const addEventListenerSpy = vi.spyOn(window, "addEventListener");
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useOnlineStatus());

      // Should have added listeners
      expect(addEventListenerSpy).toHaveBeenCalledWith("online", expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith("offline", expect.any(Function));

      // Unmount and verify cleanup
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith("online", expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith("offline", expect.any(Function));

      // Cleanup spies
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
