import * as Sentry from "@sentry/node";
import type { Context, MiddlewareHandler } from "hono";

// Sentry configuration
const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || "development";

// Initialize Sentry only once
let isInitialized = false;

/**
 * Initialize Sentry error tracking for Node.js server
 * Call this early in app startup
 */
export function initSentry() {
  if (isInitialized || !SENTRY_DSN) {
    if (!SENTRY_DSN && ENVIRONMENT === "development") {
      console.log("🛡️ Sentry not configured (SENTRY_DSN missing)");
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Filter out PII before sending
    beforeSend(event) {
      // Remove email from user context
      if (event.user?.email) {
        delete event.user.email;
      }
      return event;
    },

    // Ignore common errors
    ignoreErrors: [
      "ECONNRESET",
      "ETIMEDOUT",
    ],
  });

  isInitialized = true;

  if (ENVIRONMENT === "development") {
    console.log("🛡️ Sentry initialized");
  }
}

/**
 * Sentry middleware for Hono
 * Captures errors and adds request context
 */
export function sentryMiddleware(): MiddlewareHandler {
  return async (c: Context, next) => {
    // Add request context to Sentry
    Sentry.setContext("request", {
      method: c.req.method,
      url: c.req.url,
      path: c.req.path,
    });

    try {
      await next();
    } catch (error) {
      // Capture the error
      Sentry.captureException(error, {
        extra: {
          method: c.req.method,
          url: c.req.url,
          path: c.req.path,
        },
      });
      throw error; // Re-throw so Hono can handle it
    }
  };
}

/**
 * Set session context for error correlation
 */
export function setSessionContext(sessionToken: string) {
  Sentry.setUser({ id: sessionToken });
}

/**
 * Clear user context
 */
export function clearSessionContext() {
  Sentry.setUser(null);
}

/**
 * Add a breadcrumb for tracking
 */
export function addBreadcrumb(
  message: string,
  category: string = "server",
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
