// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const experimentState = vi.hoisted(() => ({
  variant: "badges_a",
  isLoading: false,
}));

vi.mock("@/hooks/use-experiment", () => ({
  useExperiment: () => ({
    variant: experimentState.variant,
    isLoading: experimentState.isLoading,
  }),
}));

const posthogMock = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock("@/lib/posthog", () => ({
  posthog: { capture: posthogMock.capture },
}));

import { TrustBadges } from "./TrustBadges";

function createIntersectionObserverEntry(
  target: Element,
  isIntersecting: boolean,
): IntersectionObserverEntry {
  const rect = target.getBoundingClientRect();
  const emptyRect = new DOMRectReadOnly(0, 0, 0, 0);

  return {
    time: 0,
    target,
    rootBounds: null,
    boundingClientRect: rect,
    intersectionRect: isIntersecting ? rect : emptyRect,
    isIntersecting,
    intersectionRatio: isIntersecting ? 1 : 0,
  };
}

describe("TrustBadges", () => {
  const originalIO = window.IntersectionObserver;

  beforeEach(() => {
    posthogMock.capture.mockClear();
    experimentState.variant = "badges_a";
    experimentState.isLoading = false;
  });

  afterEach(() => {
    cleanup();
    window.IntersectionObserver = originalIO;
  });

  it("does not capture exposure until intersecting", () => {
    let callback: IntersectionObserverCallback = () => {};
    let observer: IntersectionObserver | null = null;

    window.IntersectionObserver = class implements IntersectionObserver {
      root: Element | Document | null = null;
      rootMargin = "";
      thresholds = [];

      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
        observer = this;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;

    render(<TrustBadges />);
    const target = document.querySelector("div");

    expect(target).not.toBeNull();
    expect(observer).not.toBeNull();

    expect(posthogMock.capture).not.toHaveBeenCalled();

    callback(
      [createIntersectionObserverEntry(target!, false)],
      observer!,
    );

    expect(posthogMock.capture).not.toHaveBeenCalled();

    callback(
      [createIntersectionObserverEntry(target!, true)],
      observer!,
    );

    expect(posthogMock.capture).toHaveBeenCalledTimes(1);
    expect(posthogMock.capture).toHaveBeenCalledWith("trust_badges_shown", { variant: "badges_a" });
  });

  it("does not capture while the experiment is still loading", () => {
    experimentState.isLoading = true;

    render(<TrustBadges />);

    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("captures immediately when IntersectionObserver is unavailable", () => {
    Reflect.deleteProperty(window, "IntersectionObserver");

    render(<TrustBadges />);

    expect(posthogMock.capture).toHaveBeenCalledTimes(1);
    expect(posthogMock.capture).toHaveBeenCalledWith("trust_badges_shown", { variant: "badges_a" });
  });
});
