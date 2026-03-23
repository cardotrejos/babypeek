import { afterEach, describe, expect, it, vi } from "vitest";

const sentryMock = vi.hoisted(() => ({
  addBreadcrumb: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: "browserTracingIntegration" })),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  init: vi.fn(),
  replayIntegration: vi.fn((options: unknown) => ({
    name: "replayIntegration",
    options,
  })),
  setUser: vi.fn(),
}));

vi.mock("@sentry/react", () => sentryMock);

describe("getSentryInitConfig", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults tracing and replay off when vars unset", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    const { getSentryInitConfig } = await import("./sentry");
    const c = getSentryInitConfig();
    expect(c.tracesSampleRate).toBe(0);
    expect(c.replaysSessionSampleRate).toBe(0);
    expect(c.replaysOnErrorSampleRate).toBe(0);
    expect(c.integrations?.length).toBe(0);
    expect(sentryMock.browserTracingIntegration).not.toHaveBeenCalled();
    expect(sentryMock.replayIntegration).not.toHaveBeenCalled();
  });

  it.each(["true", "1"])(
    "enables tracing when VITE_SENTRY_ENABLE_TRACING is %s",
    async (value) => {
      vi.stubEnv("VITE_SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
      vi.stubEnv("VITE_SENTRY_ENABLE_TRACING", value);
      const { getSentryInitConfig } = await import("./sentry");
      const c = getSentryInitConfig();
      expect(c.tracesSampleRate).toBe(1);
      expect(c.integrations).toEqual([{ name: "browserTracingIntegration" }]);
      expect(sentryMock.browserTracingIntegration).toHaveBeenCalledTimes(1);
      expect(sentryMock.replayIntegration).not.toHaveBeenCalled();
    },
  );

  it("disables tracing when VITE_SENTRY_ENABLE_TRACING is not true", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    vi.stubEnv("VITE_SENTRY_ENABLE_TRACING", "false");
    vi.stubEnv("VITE_SENTRY_ENABLE_REPLAY", "true");
    const { getSentryInitConfig } = await import("./sentry");
    const c = getSentryInitConfig();
    expect(c.tracesSampleRate).toBe(0);
    expect(c.replaysSessionSampleRate).toBe(0.1);
    expect(c.integrations?.length).toBe(1);
    expect(sentryMock.browserTracingIntegration).not.toHaveBeenCalled();
    expect(sentryMock.replayIntegration).toHaveBeenCalledTimes(1);
  });

  it.each(["true", "1"])(
    "enables replay when VITE_SENTRY_ENABLE_REPLAY is %s",
    async (value) => {
      vi.stubEnv("VITE_SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
      vi.stubEnv("VITE_SENTRY_ENABLE_REPLAY", value);
      const { getSentryInitConfig } = await import("./sentry");
      const c = getSentryInitConfig();
      expect(c.replaysSessionSampleRate).toBe(0.1);
      expect(c.replaysOnErrorSampleRate).toBe(1);
      expect(c.integrations).toEqual([
        {
          name: "replayIntegration",
          options: {
            blockAllMedia: true,
            maskAllText: true,
          },
        },
      ]);
      expect(sentryMock.replayIntegration).toHaveBeenCalledWith({
        blockAllMedia: true,
        maskAllText: true,
      });
      expect(sentryMock.browserTracingIntegration).not.toHaveBeenCalled();
    },
  );

  it("disables replay when VITE_SENTRY_ENABLE_REPLAY is not true", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    vi.stubEnv("VITE_SENTRY_ENABLE_REPLAY", "false");
    vi.stubEnv("VITE_SENTRY_ENABLE_TRACING", "true");
    const { getSentryInitConfig } = await import("./sentry");
    const c = getSentryInitConfig();
    expect(c.tracesSampleRate).toBe(1);
    expect(c.replaysSessionSampleRate).toBe(0);
    expect(c.replaysOnErrorSampleRate).toBe(0);
    expect(c.integrations?.length).toBe(1);
    expect(sentryMock.browserTracingIntegration).toHaveBeenCalledTimes(1);
    expect(sentryMock.replayIntegration).not.toHaveBeenCalled();
  });

  it("omits both integrations when tracing and replay disabled", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    vi.stubEnv("VITE_SENTRY_ENABLE_TRACING", "false");
    vi.stubEnv("VITE_SENTRY_ENABLE_REPLAY", "false");
    const { getSentryInitConfig } = await import("./sentry");
    const c = getSentryInitConfig();
    expect(c.integrations?.length).toBe(0);
    expect(sentryMock.browserTracingIntegration).not.toHaveBeenCalled();
    expect(sentryMock.replayIntegration).not.toHaveBeenCalled();
  });
});
