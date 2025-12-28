import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVisibilityChange } from "./use-visibility-change";

describe("useVisibilityChange", () => {
  let originalVisibilityState: PropertyDescriptor | undefined;
  let visibilityState: DocumentVisibilityState = "visible";

  beforeEach(() => {
    // Mock document.visibilityState
    originalVisibilityState = Object.getOwnPropertyDescriptor(document, "visibilityState");
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });
  });

  afterEach(() => {
    // Restore original
    if (originalVisibilityState) {
      Object.defineProperty(document, "visibilityState", originalVisibilityState);
    }
    visibilityState = "visible";
    vi.restoreAllMocks();
  });

  const triggerVisibilityChange = (state: DocumentVisibilityState) => {
    visibilityState = state;
    document.dispatchEvent(new Event("visibilitychange"));
  };

  it("calls onVisible when page becomes visible", () => {
    const onVisible = vi.fn();
    renderHook(() => useVisibilityChange(onVisible));

    // Start hidden, then become visible
    triggerVisibilityChange("hidden");
    expect(onVisible).not.toHaveBeenCalled();

    triggerVisibilityChange("visible");
    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it("does not call onVisible when page becomes hidden", () => {
    const onVisible = vi.fn();
    renderHook(() => useVisibilityChange(onVisible));

    triggerVisibilityChange("hidden");
    expect(onVisible).not.toHaveBeenCalled();
  });

  it("calls onHidden when page becomes hidden (if provided)", () => {
    const onVisible = vi.fn();
    const onHidden = vi.fn();
    renderHook(() => useVisibilityChange(onVisible, { onHidden }));

    triggerVisibilityChange("hidden");
    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(onVisible).not.toHaveBeenCalled();
  });

  it("does not set up listener when enabled is false", () => {
    const onVisible = vi.fn();
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    renderHook(() => useVisibilityChange(onVisible, { enabled: false }));

    // Should not add listener
    expect(addEventListenerSpy).not.toHaveBeenCalledWith("visibilitychange", expect.any(Function));

    // Triggering should do nothing
    triggerVisibilityChange("visible");
    expect(onVisible).not.toHaveBeenCalled();
  });

  it("removes listener on unmount", () => {
    const onVisible = vi.fn();
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = renderHook(() => useVisibilityChange(onVisible));
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  it("handles multiple visibility changes", () => {
    const onVisible = vi.fn();
    const onHidden = vi.fn();
    renderHook(() => useVisibilityChange(onVisible, { onHidden }));

    // Simulate user backgrounds and returns multiple times
    triggerVisibilityChange("hidden");
    triggerVisibilityChange("visible");
    triggerVisibilityChange("hidden");
    triggerVisibilityChange("visible");

    expect(onVisible).toHaveBeenCalledTimes(2);
    expect(onHidden).toHaveBeenCalledTimes(2);
  });

  it("uses latest callback even after re-render", () => {
    const onVisible1 = vi.fn();
    const onVisible2 = vi.fn();

    const { rerender } = renderHook(({ onVisible }) => useVisibilityChange(onVisible), {
      initialProps: { onVisible: onVisible1 },
    });

    // Update callback
    rerender({ onVisible: onVisible2 });

    // Trigger visibility change
    triggerVisibilityChange("hidden");
    triggerVisibilityChange("visible");

    // Should call the new callback, not the old one
    expect(onVisible1).not.toHaveBeenCalled();
    expect(onVisible2).toHaveBeenCalledTimes(1);
  });

  it("respects enabled toggle", () => {
    const onVisible = vi.fn();

    const { rerender } = renderHook(({ enabled }) => useVisibilityChange(onVisible, { enabled }), {
      initialProps: { enabled: true },
    });

    // Should fire when enabled
    triggerVisibilityChange("visible");
    expect(onVisible).toHaveBeenCalledTimes(1);

    // Disable
    rerender({ enabled: false });

    // Should not fire when disabled
    triggerVisibilityChange("hidden");
    triggerVisibilityChange("visible");
    expect(onVisible).toHaveBeenCalledTimes(1); // Still 1
  });
});
