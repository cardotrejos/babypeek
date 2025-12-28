import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getDeviceType,
  getBrowserInfo,
  getOSInfo,
  getConnectionType,
  getEffectiveType,
  getPrefersReducedMotion,
  getIsTouchDevice,
  getAnalyticsContext,
} from "./analytics-context";

// =============================================================================
// Mock Setup
// =============================================================================

const originalNavigator = global.navigator;
const originalWindow = global.window;

function mockNavigator(userAgent: string, additionalProps: Record<string, unknown> = {}) {
  Object.defineProperty(global, "navigator", {
    value: {
      userAgent,
      maxTouchPoints: 0,
      ...additionalProps,
    },
    writable: true,
    configurable: true,
  });
}

function mockDocument(props: Record<string, unknown> = {}) {
  Object.defineProperty(global, "document", {
    value: props,
    writable: true,
    configurable: true,
  });
}

function mockWindow(props: Record<string, unknown> = {}) {
  Object.defineProperty(global, "window", {
    value: {
      innerWidth: 1920,
      innerHeight: 1080,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      ...props,
    },
    writable: true,
    configurable: true,
  });
}

// =============================================================================
// Device Type Detection Tests
// =============================================================================

describe("getDeviceType", () => {
  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("should detect mobile devices", () => {
    mockNavigator("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(getDeviceType()).toBe("mobile");
  });

  it("should detect Android mobile devices", () => {
    mockNavigator("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile");
    expect(getDeviceType()).toBe("mobile");
  });

  it("should detect tablets (iPad)", () => {
    mockNavigator("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)");
    expect(getDeviceType()).toBe("tablet");
  });

  it("should detect tablets (Android tablet)", () => {
    mockNavigator("Mozilla/5.0 (Linux; Android 14; SM-T970)");
    expect(getDeviceType()).toBe("tablet");
  });

  it("should detect desktop devices", () => {
    mockNavigator("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120");
    expect(getDeviceType()).toBe("desktop");
  });

  it("should detect macOS desktop", () => {
    mockNavigator("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120");
    // Mock document without ontouchend to simulate desktop
    mockDocument({});
    expect(getDeviceType()).toBe("desktop");
  });
});

// =============================================================================
// Browser Detection Tests
// =============================================================================

describe("getBrowserInfo", () => {
  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("should detect Chrome", () => {
    mockNavigator("Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36");
    expect(getBrowserInfo()).toBe("Chrome 120");
  });

  it("should detect Firefox", () => {
    mockNavigator("Mozilla/5.0 Firefox/121.0");
    expect(getBrowserInfo()).toBe("Firefox 121");
  });

  it("should detect Safari", () => {
    mockNavigator("Mozilla/5.0 Version/17.2 Safari/605.1.15");
    expect(getBrowserInfo()).toBe("Safari 17");
  });

  it("should detect Edge", () => {
    mockNavigator("Mozilla/5.0 Chrome/120 Edg/120.0.0.0");
    expect(getBrowserInfo()).toBe("Edge 120");
  });

  it("should return unknown for unrecognized browsers", () => {
    mockNavigator("Some Unknown Browser");
    expect(getBrowserInfo()).toBe("unknown");
  });
});

// =============================================================================
// OS Detection Tests
// =============================================================================

describe("getOSInfo", () => {
  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("should detect iOS", () => {
    mockNavigator("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)");
    expect(getOSInfo()).toBe("iOS 17");
  });

  it("should detect Android", () => {
    mockNavigator("Mozilla/5.0 (Linux; Android 14; Pixel 8)");
    expect(getOSInfo()).toBe("Android 14");
  });

  it("should detect Windows 10/11", () => {
    mockNavigator("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect(getOSInfo()).toBe("Windows 10/11");
  });

  it("should detect macOS", () => {
    mockNavigator("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(getOSInfo()).toBe("macOS 10");
  });

  it("should detect Linux", () => {
    mockNavigator("Mozilla/5.0 (X11; Linux x86_64)");
    expect(getOSInfo()).toBe("Linux");
  });
});

// =============================================================================
// Connection Type Tests
// =============================================================================

describe("getConnectionType", () => {
  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("should return wifi when connection type is wifi", () => {
    mockNavigator("Mozilla/5.0", {
      connection: { type: "wifi" },
    });
    expect(getConnectionType()).toBe("wifi");
  });

  it("should return cellular when connection type is cellular", () => {
    mockNavigator("Mozilla/5.0", {
      connection: { type: "cellular" },
    });
    expect(getConnectionType()).toBe("cellular");
  });

  it("should return unknown when connection API not available", () => {
    mockNavigator("Mozilla/5.0");
    expect(getConnectionType()).toBe("unknown");
  });
});

// =============================================================================
// Effective Type Tests
// =============================================================================

describe("getEffectiveType", () => {
  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("should return 4g when effectiveType is 4g", () => {
    mockNavigator("Mozilla/5.0", {
      connection: { effectiveType: "4g" },
    });
    expect(getEffectiveType()).toBe("4g");
  });

  it("should return 3g when effectiveType is 3g", () => {
    mockNavigator("Mozilla/5.0", {
      connection: { effectiveType: "3g" },
    });
    expect(getEffectiveType()).toBe("3g");
  });

  it("should return unknown when connection API not available", () => {
    mockNavigator("Mozilla/5.0");
    expect(getEffectiveType()).toBe("unknown");
  });
});

// =============================================================================
// Accessibility Tests
// =============================================================================

describe("getPrefersReducedMotion", () => {
  afterEach(() => {
    Object.defineProperty(global, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it("should return true when user prefers reduced motion", () => {
    mockWindow({
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    });
    expect(getPrefersReducedMotion()).toBe(true);
  });

  it("should return false when user does not prefer reduced motion", () => {
    mockWindow({
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    expect(getPrefersReducedMotion()).toBe(false);
  });
});

// =============================================================================
// Touch Device Tests
// =============================================================================

describe("getIsTouchDevice", () => {
  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it("should return true for touch devices", () => {
    mockNavigator("Mozilla/5.0", { maxTouchPoints: 5 });
    mockWindow();
    expect(getIsTouchDevice()).toBe(true);
  });

  it("should return false for non-touch devices", () => {
    mockNavigator("Mozilla/5.0", { maxTouchPoints: 0 });
    mockWindow();
    expect(getIsTouchDevice()).toBe(false);
  });
});

// =============================================================================
// Full Context Tests
// =============================================================================

describe("getAnalyticsContext", () => {
  beforeEach(() => {
    mockNavigator("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120", {
      maxTouchPoints: 0,
    });
    mockWindow({
      innerWidth: 1920,
      innerHeight: 1080,
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it("should return complete analytics context", () => {
    const context = getAnalyticsContext();

    expect(context).toHaveProperty("device_type");
    expect(context).toHaveProperty("browser");
    expect(context).toHaveProperty("os");
    expect(context).toHaveProperty("viewport_width");
    expect(context).toHaveProperty("viewport_height");
    expect(context).toHaveProperty("connection_type");
    expect(context).toHaveProperty("effective_type");
    expect(context).toHaveProperty("prefers_reduced_motion");
    expect(context).toHaveProperty("is_touch_device");
  });

  it("should have correct types for all properties", () => {
    const context = getAnalyticsContext();

    expect(typeof context.device_type).toBe("string");
    expect(typeof context.browser).toBe("string");
    expect(typeof context.os).toBe("string");
    expect(typeof context.viewport_width).toBe("number");
    expect(typeof context.viewport_height).toBe("number");
    expect(typeof context.connection_type).toBe("string");
    expect(typeof context.effective_type).toBe("string");
    expect(typeof context.prefers_reduced_motion).toBe("boolean");
    expect(typeof context.is_touch_device).toBe("boolean");
  });
});
