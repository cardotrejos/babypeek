import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.MODE;
const SENTRY_ENABLE_TRACING = import.meta.env.VITE_SENTRY_ENABLE_TRACING;
const SENTRY_ENABLE_REPLAY = import.meta.env.VITE_SENTRY_ENABLE_REPLAY;

function isEnabled(raw: string | undefined): boolean {
  return raw === "true" || raw === "1";
}

let isInitialized = false;

export function getSentryInitConfig(): Sentry.BrowserOptions {
  const tracingOn = isEnabled(SENTRY_ENABLE_TRACING);
  const replayOn = isEnabled(SENTRY_ENABLE_REPLAY);

  const integrations: NonNullable<Sentry.BrowserOptions["integrations"]> = [];
  if (tracingOn) {
    integrations.push(Sentry.browserTracingIntegration());
  }
  if (replayOn) {
    integrations.push(
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    );
  }

  return {
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    integrations,
    tracesSampleRate: tracingOn ? (ENVIRONMENT === "production" ? 0.1 : 1.0) : 0,
    replaysSessionSampleRate: replayOn ? 0.1 : 0,
    replaysOnErrorSampleRate: replayOn ? 1.0 : 0,

    beforeSend(event) {
      if (event.user?.email) {
        delete event.user.email;
      }
      return event;
    },

    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      "Invalid regular expression",
      /Java bridge method invocation error/,
      /evaluating 'window\.webkit\.messageHandlers\[.*\]\.postMessage'/,
      /Error invoking postMessage/,
      "fb_xd_fragment",
      "instantSearchSDKJSBridgeClearHighlight",
    ],

    denyUrls: [
      /connect\.facebook\.net/i,
      /graph\.facebook\.com/i,
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  };
}

export function initSentry() {
  if (isInitialized || typeof window === "undefined" || !SENTRY_DSN) {
    if (import.meta.env.DEV && !SENTRY_DSN) {
      console.log("🛡️ Sentry not configured (VITE_SENTRY_DSN missing)");
    }
    return;
  }

  Sentry.init(getSentryInitConfig());

  isInitialized = true;

  if (import.meta.env.DEV) {
    console.log("🛡️ Sentry initialized");
  }
}

export function setSessionContext(userId: string) {
  Sentry.setUser({ id: userId });
}

export function clearSessionContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(
  message: string,
  category: string = "user-action",
  data?: Record<string, unknown>,
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  Sentry.captureMessage(message, level);
}

export const isSentryConfigured = () => !!SENTRY_DSN;

export { Sentry };
