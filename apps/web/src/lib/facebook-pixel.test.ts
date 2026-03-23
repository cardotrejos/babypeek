import { afterEach, describe, expect, it, vi } from "vitest";

const FB_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";
const FB_LOAD_TIMEOUT_MS = 5000;

function getPixelScript(): HTMLScriptElement | null {
  return document.querySelector(`script[src="${FB_SCRIPT_SRC}"]`);
}

function getFbq() {
  return window.fbq as unknown as {
    (cmd: string, ...rest: unknown[]): void;
    callMethod?: (...args: unknown[]) => void;
    queue?: unknown[];
  };
}

describe("facebook-pixel loader", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.resetModules();
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    delete (window as unknown as { fbq?: unknown }).fbq;
    delete (window as unknown as { _fbq?: unknown })._fbq;
  });

  it("ensureFBPixelLoaded resolves false when pixel id is missing", async () => {
    vi.stubEnv("VITE_FACEBOOK_PIXEL_ID", "");
    const mod = await import("./facebook-pixel");
    await expect(mod.ensureFBPixelLoaded()).resolves.toBe(false);
  });

  it("ensureFBPixelLoaded injects one fbevents script and resolves true on load", async () => {
    vi.stubEnv("VITE_FACEBOOK_PIXEL_ID", "123456789012345");
    document.head.innerHTML = "<script></script>";

    const mod = await import("./facebook-pixel");
    const pending = mod.ensureFBPixelLoaded();

    const injected = getPixelScript();
    expect(injected).not.toBeNull();
    expect(injected?.async).toBe(true);

    injected?.dispatchEvent(new Event("load"));
    await expect(pending).resolves.toBe(true);
    expect(window.fbq).toBeDefined();
  });

  it("ensureFBPixelLoaded dedupes concurrent loads to a single script", async () => {
    vi.stubEnv("VITE_FACEBOOK_PIXEL_ID", "123456789012345");
    document.head.innerHTML = "<script></script>";

    const mod = await import("./facebook-pixel");
    const a = mod.ensureFBPixelLoaded();
    const b = mod.ensureFBPixelLoaded();

    expect(document.querySelectorAll(`script[src="${FB_SCRIPT_SRC}"]`)).toHaveLength(1);

    getPixelScript()?.dispatchEvent(new Event("load"));
    await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
  });

  it("ensureFBPixelLoaded retries after a script error", async () => {
    vi.stubEnv("VITE_FACEBOOK_PIXEL_ID", "123456789012345");
    document.head.innerHTML = "<script></script>";

    const mod = await import("./facebook-pixel");
    const firstAttempt = mod.ensureFBPixelLoaded();
    const failedScript = getPixelScript();

    failedScript?.dispatchEvent(new Event("error"));
    await expect(firstAttempt).resolves.toBe(false);

    const secondAttempt = mod.ensureFBPixelLoaded();
    const retriedScript = getPixelScript();

    expect(retriedScript).not.toBeNull();
    expect(retriedScript).not.toBe(failedScript);

    retriedScript?.dispatchEvent(new Event("load"));
    await expect(secondAttempt).resolves.toBe(true);
  });

  it("ensureFBPixelLoaded times out stale scripts and allows retry", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_FACEBOOK_PIXEL_ID", "123456789012345");
    document.head.innerHTML = `<script src="${FB_SCRIPT_SRC}" data-babypeek-fb-pixel="1"></script><script></script>`;

    const mod = await import("./facebook-pixel");
    const firstAttempt = mod.ensureFBPixelLoaded();

    await vi.advanceTimersByTimeAsync(FB_LOAD_TIMEOUT_MS);
    await expect(firstAttempt).resolves.toBe(false);
    expect(getPixelScript()).toBeNull();

    const secondAttempt = mod.ensureFBPixelLoaded();
    const retriedScript = getPixelScript();

    expect(retriedScript).not.toBeNull();
    retriedScript?.dispatchEvent(new Event("load"));
    await expect(secondAttempt).resolves.toBe(true);
  });

  it("initFBPixel resolves false when pixel id is missing", async () => {
    vi.stubEnv("VITE_FACEBOOK_PIXEL_ID", "");
    const mod = await import("./facebook-pixel");
    await expect(mod.initFBPixel()).resolves.toBe(false);
  });

  it("initFBPixel loads once, calls init + PageView, and dedupes concurrent inits", async () => {
    vi.stubEnv("VITE_FACEBOOK_PIXEL_ID", "123456789012345");
    document.head.innerHTML = "<script></script>";

    const mod = await import("./facebook-pixel");
    const trackSpy = vi.fn();
    const initSpy = vi.fn();

    const pendingLoad = mod.ensureFBPixelLoaded();
    getPixelScript()?.dispatchEvent(new Event("load"));
    await pendingLoad;

    const fbq = getFbq();
    fbq.callMethod = (...args: unknown[]) => {
      if (args[0] === "init") initSpy(...args);
      if (args[0] === "track") trackSpy(...args);
    };

    const first = mod.initFBPixel();
    const second = mod.initFBPixel();
    expect(second).toBe(first);

    await expect(first).resolves.toBe(true);
    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(initSpy).toHaveBeenCalledWith("init", "123456789012345");
    expect(trackSpy).toHaveBeenCalledWith("track", "PageView");
    expect(mod.isFBPixelConfigured()).toBe(true);
  });

  it("initFBPixel retries after init failure", async () => {
    vi.stubEnv("VITE_FACEBOOK_PIXEL_ID", "123456789012345");
    document.head.innerHTML = "<script></script>";
    vi.spyOn(console, "error").mockImplementation(() => {});

    const mod = await import("./facebook-pixel");
    const initSpy = vi.fn();
    const trackSpy = vi.fn();

    const firstAttempt = mod.initFBPixel();
    const fbq = getFbq();
    let shouldFail = true;

    fbq.callMethod = (...args: unknown[]) => {
      if (args[0] === "init") {
        initSpy(...args);
        if (shouldFail) {
          throw new Error("init failed");
        }
      }
      if (args[0] === "track") {
        trackSpy(...args);
      }
    };

    getPixelScript()?.dispatchEvent(new Event("load"));
    await expect(firstAttempt).resolves.toBe(false);

    shouldFail = false;
    await expect(mod.initFBPixel()).resolves.toBe(true);
    expect(initSpy).toHaveBeenCalledTimes(2);
    expect(trackSpy).toHaveBeenCalledTimes(1);
  });

  it("trackFBPageView sends one extra PageView when one route change happens before init", async () => {
    vi.stubEnv("VITE_FACEBOOK_PIXEL_ID", "123456789012345");
    document.head.innerHTML = "<script></script>";

    const mod = await import("./facebook-pixel");
    const initSpy = vi.fn();
    const trackSpy = vi.fn();

    mod.trackFBPageView();

    const fbq = getFbq();
    fbq.callMethod = (...args: unknown[]) => {
      if (args[0] === "init") initSpy(...args);
      if (args[0] === "track") trackSpy(...args);
    };

    getPixelScript()?.dispatchEvent(new Event("load"));
    await expect(mod.initFBPixel()).resolves.toBe(true);
    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledTimes(2);

    mod.trackFBPageView();
    expect(trackSpy).toHaveBeenCalledTimes(3);
  });

  it("trackFBPageView coalesces multiple pre-init route changes into one extra PageView", async () => {
    vi.stubEnv("VITE_FACEBOOK_PIXEL_ID", "123456789012345");
    document.head.innerHTML = "<script></script>";

    const mod = await import("./facebook-pixel");
    const trackSpy = vi.fn();

    mod.trackFBPageView();
    mod.trackFBPageView();
    mod.trackFBPageView();

    const fbq = getFbq();
    fbq.callMethod = (...args: unknown[]) => {
      if (args[0] === "track") trackSpy(...args);
    };

    getPixelScript()?.dispatchEvent(new Event("load"));
    await expect(mod.initFBPixel()).resolves.toBe(true);
    expect(trackSpy).toHaveBeenCalledTimes(2);
  });

  it("trackFBPageView does not throw when pixel is unavailable", async () => {
    vi.stubEnv("VITE_FACEBOOK_PIXEL_ID", "");
    vi.spyOn(console, "log").mockImplementation(() => {});
    const mod = await import("./facebook-pixel");
    expect(() => mod.trackFBPageView()).not.toThrow();
  });
});
