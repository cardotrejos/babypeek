import * as Sentry from "@sentry/node";
import { createMiddleware } from "hono/factory";
import { env, isSentryConfigured } from "../lib/env";

// =============================================================================
// Sentry Initialization
// =============================================================================

let isInitialized = false;

/**
 * Initialize Sentry for backend error tracking
 * Call this early in server startup
 */
export function initSentry() {
  if (isInitialized || !isSentryConfigured()) {
    if (env.NODE_ENV === "development" && !isSentryConfigured()) {
      console.log("🛡️ Sentry not configured (SENTRY_DSN missing)");
    }
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,

    // Performance monitoring
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Filter out PII
    beforeSend(event) {
      // Remove any email addresses from user context
      if (event.user?.email) {
        delete event.user.email;
      }
      return event;
    },
  });

  isInitialized = true;

  if (env.NODE_ENV === "development") {
    console.log("🛡️ Sentry backend initialized");
  }
}

// =============================================================================
// Hono Middleware
// =============================================================================

/**
 * Sentry middleware for Hono
 * - Attaches session token to Sentry user context
 * - Captures unhandled errors
 */
export const sentryMiddleware = createMiddleware(async (c, next) => {
  // Attach session token to Sentry context if present
  const sessionToken = c.req.header("X-Session-Token");

  if (sessionToken && isSentryConfigured()) {
    Sentry.setUser({ id: sessionToken });
  }

  try {
    await next();
  } catch (error) {
    // Capture error to Sentry
    if (isSentryConfigured()) {
      Sentry.captureException(error, {
        extra: {
          path: c.req.path,
          method: c.req.method,
        },
      });
    }

    // Re-throw to let Hono handle the error response
    throw error;
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Set session context for error correlation
 */
export function setSessionContext(sessionToken: string) {
  if (isSentryConfigured()) {
    Sentry.setUser({ id: sessionToken });
  }
}

/**
 * Clear session context
 */
export function clearSessionContext() {
  if (isSentryConfigured()) {
    Sentry.setUser(null);
  }
}

/**
 * Add a breadcrumb for action tracking
 */
export function addBreadcrumb(
  message: string,
  category: string = "server-action",
  data?: Record<string, unknown>,
) {
  if (isSentryConfigured()) {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: "info",
    });
  }
}

/**
 * Capture an exception with optional context
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (isSentryConfigured()) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else if (env.NODE_ENV === "development") {
    console.error("🛡️ [Sentry Mock] Exception:", error.message, context);
  }
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  if (isSentryConfigured()) {
    Sentry.captureMessage(message, level);
  } else if (env.NODE_ENV === "development") {
    console.log(`🛡️ [Sentry Mock] ${level}: ${message}`);
  }
}

// Re-export Sentry for direct access
export { Sentry };
