import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Device detection tests
 * Story 8.2: iMessage Share Button
 *
 * Tests verify both the logic patterns AND the actual implementation
 * with mocked navigator properties.
 */

describe("device-detection", () => {
  // Store original values
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  function mockNavigator(overrides: {
    userAgent?: string;
    platform?: string;
    maxTouchPoints?: number;
  }) {
    Object.defineProperty(globalThis, "navigator", {
      value: {
        userAgent: overrides.userAgent ?? "",
        platform: overrides.platform ?? "",
        maxTouchPoints: overrides.maxTouchPoints ?? 0,
      },
      configurable: true,
      writable: true,
    });
  }

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  describe("isIOS", () => {
    it("should return true for iPhone user agent", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        platform: "iPhone",
      });
      const { isIOS } = await import("./device-detection");
      expect(isIOS()).toBe(true);
    });

    it("should return true for iPad user agent", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
        platform: "iPad",
      });
      const { isIOS } = await import("./device-detection");
      expect(isIOS()).toBe(true);
    });

    it("should return true for iPod user agent", async () => {
      mockNavigator({
        userAgent:
          "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
        platform: "iPod",
      });
      const { isIOS } = await import("./device-detection");
      expect(isIOS()).toBe(true);
    });

    it("should return true for iPad with macOS user agent (iOS 13+)", async () => {
      // iPad iOS 13+ reports as Mac but has touch points
      mockNavigator({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
      });
      const { isIOS } = await import("./device-detection");
      expect(isIOS()).toBe(true);
    });

    it("should return false for Mac desktop without touch", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 0,
      });
      const { isIOS } = await import("./device-detection");
      expect(isIOS()).toBe(false);
    });

    it("should return false for Android user agent", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/116.0.0.0",
        platform: "Linux armv8l",
      });
      const { isIOS } = await import("./device-detection");
      expect(isIOS()).toBe(false);
    });

    it("should return false for Windows user agent", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        platform: "Win32",
      });
      const { isIOS } = await import("./device-detection");
      expect(isIOS()).toBe(false);
    });
  });

  describe("isAndroid", () => {
    it("should return true for Android phone user agent", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/116.0.0.0",
      });
      const { isAndroid } = await import("./device-detection");
      expect(isAndroid()).toBe(true);
    });

    it("should return true for Android tablet user agent", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (Linux; Android 12; SM-T870) AppleWebKit/537.36 Chrome/116.0.0.0",
      });
      const { isAndroid } = await import("./device-detection");
      expect(isAndroid()).toBe(true);
    });

    it("should return false for iOS user agent", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      });
      const { isAndroid } = await import("./device-detection");
      expect(isAndroid()).toBe(false);
    });

    it("should return false for Windows user agent", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      });
      const { isAndroid } = await import("./device-detection");
      expect(isAndroid()).toBe(false);
    });
  });

  describe("isMobile", () => {
    it("should return true for iOS device", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      });
      const { isMobile } = await import("./device-detection");
      expect(isMobile()).toBe(true);
    });

    it("should return true for Android device", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/116.0.0.0",
      });
      const { isMobile } = await import("./device-detection");
      expect(isMobile()).toBe(true);
    });

    it("should return false for desktop", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        platform: "Win32",
        maxTouchPoints: 0,
      });
      const { isMobile } = await import("./device-detection");
      expect(isMobile()).toBe(false);
    });
  });

  describe("getDeviceType", () => {
    it("should return 'ios' for iPhone", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
      });
      const { getDeviceType } = await import("./device-detection");
      expect(getDeviceType()).toBe("ios");
    });

    it("should return 'android' for Android", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/116.0.0.0",
      });
      const { getDeviceType } = await import("./device-detection");
      expect(getDeviceType()).toBe("android");
    });

    it("should return 'desktop' for Windows", async () => {
      mockNavigator({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        platform: "Win32",
        maxTouchPoints: 0,
      });
      const { getDeviceType } = await import("./device-detection");
      expect(getDeviceType()).toBe("desktop");
    });
  });

  describe("SSR safety", () => {
    it("should return false for isIOS when window is undefined", async () => {
      // @ts-expect-error - testing SSR
      delete globalThis.window;
      const { isIOS } = await import("./device-detection");
      expect(isIOS()).toBe(false);
    });

    it("should return false for isAndroid when window is undefined", async () => {
      // @ts-expect-error - testing SSR
      delete globalThis.window;
      const { isAndroid } = await import("./device-detection");
      expect(isAndroid()).toBe(false);
    });

    it("should return false for isMobile when window is undefined", async () => {
      // @ts-expect-error - testing SSR
      delete globalThis.window;
      const { isMobile } = await import("./device-detection");
      expect(isMobile()).toBe(false);
    });

    it("should return 'desktop' for getDeviceType when window is undefined", async () => {
      // @ts-expect-error - testing SSR
      delete globalThis.window;
      const { getDeviceType } = await import("./device-detection");
      expect(getDeviceType()).toBe("desktop");
    });
  });
});
