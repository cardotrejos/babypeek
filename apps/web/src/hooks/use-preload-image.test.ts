import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePreloadImage } from "./use-preload-image";

// Store the mock Image instance for test control
let mockImageInstance: MockImage | null = null;

class MockImage {
  src = "";
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;

  constructor() {
    mockImageInstance = this;
  }

  // Test helper to simulate successful load
  simulateLoad() {
    this.onload?.();
  }

  // Test helper to simulate error
  simulateError() {
    this.onerror?.(new Error("Failed to load"));
  }
}

describe("usePreloadImage", () => {
  beforeEach(() => {
    mockImageInstance = null;
    // @ts-expect-error - mocking global Image
    global.Image = MockImage;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial state", () => {
    it("should start with isLoaded=false and isLoading=false when no URL", () => {
      const { result } = renderHook(() => usePreloadImage(null));

      expect(result.current.isLoaded).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should start loading when URL is provided", () => {
      const { result } = renderHook(() => usePreloadImage("https://example.com/image.jpg"));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isLoaded).toBe(false);
    });
  });

  describe("Loading behavior", () => {
    it("should set isLoaded=true when image loads successfully", () => {
      const { result } = renderHook(() => usePreloadImage("https://example.com/image.jpg"));

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Simulate successful load
      act(() => {
        mockImageInstance?.simulateLoad();
      });

      expect(result.current.isLoaded).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should set error when image fails to load", () => {
      const { result } = renderHook(() => usePreloadImage("https://example.com/error-image.jpg"));

      // Simulate error
      act(() => {
        mockImageInstance?.simulateError();
      });

      expect(result.current.isLoaded).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain("Failed to preload");
    });
  });

  describe("URL changes", () => {
    it("should reset and reload when URL changes", () => {
      const { result, rerender } = renderHook(({ url }) => usePreloadImage(url), {
        initialProps: { url: "https://example.com/image1.jpg" },
      });

      // Complete first load
      act(() => {
        mockImageInstance?.simulateLoad();
      });
      expect(result.current.isLoaded).toBe(true);

      // Change URL
      rerender({ url: "https://example.com/image2.jpg" });

      // Should be loading again
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isLoaded).toBe(false);

      // Complete second load
      act(() => {
        mockImageInstance?.simulateLoad();
      });
      expect(result.current.isLoaded).toBe(true);
    });

    it("should reset when URL becomes null", () => {
      const { result, rerender } = renderHook(({ url }) => usePreloadImage(url), {
        initialProps: {
          url: "https://example.com/image.jpg" as string | null,
        },
      });

      // Change to null
      rerender({ url: null });

      expect(result.current.isLoaded).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("Cleanup", () => {
    it("should clean up image handlers on unmount", () => {
      const { unmount } = renderHook(() => usePreloadImage("https://example.com/image.jpg"));

      // Unmount before load completes
      unmount();

      // Simulate load after unmount - should not throw
      expect(() => {
        mockImageInstance?.simulateLoad();
      }).not.toThrow();
    });
  });
});
