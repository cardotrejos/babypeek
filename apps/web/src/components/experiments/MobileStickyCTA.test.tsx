// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const browserIdle = vi.hoisted(() => {
  let scheduled: (() => void) | null = null;
  return {
    scheduleIdleTask: (fn: () => void) => {
      scheduled = fn;
      return () => {
        scheduled = null;
      };
    },
    getScheduled: () => scheduled,
  };
});

vi.mock("@/lib/browser-idle", () => ({
  scheduleIdleTask: browserIdle.scheduleIdleTask,
}));

const experimentState = vi.hoisted(() => ({
  variant: "sticky_free_preview",
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

import { MobileStickyCTA } from "./MobileStickyCTA";

describe("MobileStickyCTA", () => {
  beforeEach(() => {
    posthogMock.capture.mockClear();
    experimentState.variant = "sticky_free_preview";
    experimentState.isLoading = false;
    vi.stubGlobal("innerWidth", 390);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders nothing until idle activation runs", async () => {
    render(<MobileStickyCTA />);

    expect(screen.queryByText(/Start FREE Preview/i)).not.toBeInTheDocument();
    expect(browserIdle.getScheduled()).toBeTypeOf("function");

    await act(async () => {
      browserIdle.getScheduled()?.();
    });

    await waitFor(() => {
      expect(screen.getByText(/Start FREE Preview/i)).toBeInTheDocument();
    });
  });

  it("activates on first pointerdown before idle", async () => {
    render(<MobileStickyCTA />);

    expect(screen.queryByText(/Start FREE Preview/i)).not.toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(screen.getByText(/Start FREE Preview/i)).toBeInTheDocument();
    });
  });

  it("captures sticky_cta_shown at most once even after mobile state changes", async () => {
    render(<MobileStickyCTA />);

    await act(async () => {
      browserIdle.getScheduled()?.();
    });

    await waitFor(() => {
      expect(screen.getByText(/Start FREE Preview/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(posthogMock.capture).toHaveBeenCalledWith("sticky_cta_shown", {
        device: "mobile",
        viewport_width: 390,
        variant: "sticky_free_preview",
      });
    });
    expect(posthogMock.capture).toHaveBeenCalledTimes(1);

    vi.stubGlobal("innerWidth", 1024);
    fireEvent(window, new Event("resize"));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: /start free preview by uploading your ultrasound/i,
        }),
      ).not.toBeInTheDocument();
    });

    vi.stubGlobal("innerWidth", 390);
    fireEvent(window, new Event("resize"));

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /start free preview by uploading your ultrasound/i,
        }),
      ).toBeInTheDocument();
    });

    expect(posthogMock.capture).toHaveBeenCalledTimes(1);
  });

  it("remains null on desktop", async () => {
    vi.stubGlobal("innerWidth", 1024);

    render(<MobileStickyCTA />);

    await act(async () => {
      browserIdle.getScheduled()?.();
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: /start free preview by uploading your ultrasound/i,
        }),
      ).not.toBeInTheDocument();
    });

    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it("keeps the timeout fallback variant after the experiment resolves later", async () => {
    vi.useFakeTimers();
    experimentState.variant = "control";
    experimentState.isLoading = true;

    const { rerender } = render(<MobileStickyCTA />);

    await act(async () => {
      browserIdle.getScheduled()?.();
    });

    expect(
      screen.queryByRole("button", {
        name: /start free preview by uploading your ultrasound/i,
      }),
    ).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(
      screen.getByRole("button", {
        name: /start free preview by uploading your ultrasound/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Start FREE Preview/i)).toBeInTheDocument();
    expect(posthogMock.capture).toHaveBeenCalledWith("sticky_cta_shown", {
      device: "mobile",
      viewport_width: 390,
      variant: "sticky_free_preview",
    });

    experimentState.variant = "sticky_with_arrow";
    experimentState.isLoading = false;

    await act(async () => {
      rerender(<MobileStickyCTA />);
    });

    expect(screen.getByText(/Start FREE Preview/i)).toBeInTheDocument();
    expect(screen.queryByText(/See Your Baby Now/i)).not.toBeInTheDocument();
    expect(posthogMock.capture).toHaveBeenCalledTimes(1);
  });

  it("does not throw when IntersectionObserver is unavailable for the upload section", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    render(
      <>
        <section id="upload" />
        <MobileStickyCTA />
      </>,
    );

    await act(async () => {
      browserIdle.getScheduled()?.();
    });

    expect(
      screen.getByRole("button", {
        name: /start free preview by uploading your ultrasound/i,
      }),
    ).toBeInTheDocument();
  });
});
