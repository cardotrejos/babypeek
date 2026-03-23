import { afterEach, describe, expect, it, vi } from "vitest";

describe("getPostHogInitOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults autocapture, pageleave, and session recording off when vars unset", async () => {
    const { getPostHogInitOptions } = await import("./posthog");
    const o = getPostHogInitOptions();
    expect(o.autocapture).toBe(false);
    expect(o.capture_pageleave).toBe(false);
    expect(o.disable_session_recording).toBe(true);
    expect(o.session_recording).toBeUndefined();
  });

  it.each(["true", "1"])(
    "enables autocapture and pageleave when VITE_POSTHOG_AUTOCAPTURE is %s",
    async (value) => {
      vi.stubEnv("VITE_POSTHOG_AUTOCAPTURE", value);
      const { getPostHogInitOptions } = await import("./posthog");
      const o = getPostHogInitOptions();
      expect(o.autocapture).toBe(true);
      expect(o.capture_pageleave).toBe(true);
    },
  );

  it("disables autocapture and pageleave when VITE_POSTHOG_AUTOCAPTURE is not true", async () => {
    vi.stubEnv("VITE_POSTHOG_AUTOCAPTURE", "false");
    const { getPostHogInitOptions } = await import("./posthog");
    const o = getPostHogInitOptions();
    expect(o.autocapture).toBe(false);
    expect(o.capture_pageleave).toBe(false);
  });

  it.each(["true", "1"])(
    "enables session recording when VITE_POSTHOG_SESSION_RECORDING is %s",
    async (value) => {
      vi.stubEnv("VITE_POSTHOG_SESSION_RECORDING", value);
      const { getPostHogInitOptions } = await import("./posthog");
      const o = getPostHogInitOptions();
      expect(o.disable_session_recording).toBe(false);
      expect(o.session_recording).toEqual({
        maskAllInputs: true,
        recordCrossOriginIframes: false,
      });
    },
  );

  it("disables session recording when VITE_POSTHOG_SESSION_RECORDING is not true", async () => {
    vi.stubEnv("VITE_POSTHOG_SESSION_RECORDING", "false");
    const { getPostHogInitOptions } = await import("./posthog");
    const o = getPostHogInitOptions();
    expect(o.disable_session_recording).toBe(true);
    expect(o.session_recording).toBeUndefined();
  });
});
