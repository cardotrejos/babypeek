import * as Sentry from "@sentry/react";

// Sentry configuration
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.MODE;

// Initialize Sentry only once
let isInitialized = false;

/**
 * Initialize Sentry error tracking
 * Call this early in app startup
 */
export function initSentry() {
  if (isInitialized || typeof window === "undefined" || !SENTRY_DSN) {
    if (import.meta.env.DEV && !SENTRY_DSN) {
      console.log("🛡️ Sentry not configured (VITE_SENTRY_DSN missing)");
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // Privacy: mask all text
        blockAllMedia: true, // Privacy: block media
      }),
    ],

    // Sample rates
    tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% on errors

    // Filter out PII before sending
    beforeSend(event) {
      // Remove email from user context
      if (event.user?.email) {
        delete event.user.email;
      }
      return event;
    },

    // Ignore common browser errors and third-party noise
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
      // Facebook In-App Browser injects scripts that throw regex errors
      "Invalid regular expression",
      // Common third-party script errors
      "fb_xd_fragment",
      "instantSearchSDKJSBridgeClearHighlight",
    ],

    // Ignore errors from third-party scripts (Facebook, analytics, etc.)
    denyUrls: [
      /connect\.facebook\.net/i,
      /graph\.facebook\.com/i,
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  isInitialized = true;

  if (import.meta.env.DEV) {
    console.log("🛡️ Sentry initialized");
  }
}

/**
 * Set session context for error correlation
 * Call this when a session is created
 */
export function setSessionContext(sessionToken: string) {
  Sentry.setUser({ id: sessionToken });
}

/**
 * Clear user context
 * Call this when session ends or user resets
 */
export function clearSessionContext() {
  Sentry.setUser(null);
}

/**
 * Add a breadcrumb for user action tracking
 */
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

/**
 * Capture an exception with optional context
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message (for non-error events)
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  Sentry.captureMessage(message, level);
}

// Check if Sentry is configured
export const isSentryConfigured = () => !!SENTRY_DSN;

// Re-export Sentry for direct access if needed
export { Sentry };
