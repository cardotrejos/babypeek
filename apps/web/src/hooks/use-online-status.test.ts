import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useOnlineStatus } from "./use-online-status";

describe("useOnlineStatus", () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(global, "navigator", {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
  });

  describe("Initial State", () => {
    it("should return true when navigator is online", () => {
      Object.defineProperty(global.navigator, "onLine", { value: true, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(true);
    });

    it("should return false when navigator is offline", () => {
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe("Online/Offline Events", () => {
    it("should update to offline when offline event fires", () => {
      const { result } = renderHook(() => useOnlineStatus());

      // Initially online
      expect(result.current.isOnline).toBe(true);

      // Simulate going offline
      act(() => {
        Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
        window.dispatchEvent(new Event("offline"));
      });

      expect(result.current.isOnline).toBe(false);
    });

    it("should update to online when online event fires", () => {
      // Start offline
      Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(false);

      // Simulate going online
      act(() => {
        Object.defineProperty(global.navigator, "onLine", { value: true, configurable: true });
        window.dispatchEvent(new Event("online"));
      });

      expect(result.current.isOnline).toBe(true);
    });
  });

  describe("checkStatus", () => {
    it("should return current online status", () => {
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.checkStatus()).toBe(true);
    });

    it("should return updated status after going offline", () => {
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        Object.defineProperty(global.navigator, "onLine", { value: false, configurable: true });
      });

      expect(result.current.checkStatus()).toBe(false);
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
