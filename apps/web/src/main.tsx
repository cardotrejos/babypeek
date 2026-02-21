import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import { PostHogProvider, posthog } from "@/lib/posthog";
import { ErrorBoundary } from "@/components/error-boundary";
import { initSentry } from "@/lib/sentry";
import { trackFBPageView } from "@/lib/facebook-pixel";
import { initPerformanceMonitoring } from "@/lib/performance-monitoring";
import "@/index.css";

const CHUNK_LOAD_ERROR_PATTERN =
  /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i;

function renderStartupFallback(
  rootElement: HTMLElement,
  title: string,
  description: string,
  buttonText: string = "Reload BabyPeek",
) {
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#fdf8f5;font-family:'DM Sans',system-ui,-apple-system,sans-serif;color:#2f2f2f;text-align:center;">
      <div style="max-width:420px;">
        <h1 style="margin:0 0 12px 0;font-size:1.6rem;line-height:1.2;">${title}</h1>
        <p style="margin:0 0 20px 0;font-size:1rem;line-height:1.5;color:#5b5b5b;">${description}</p>
        <button
          type="button"
          onclick="window.location.reload()"
          style="border:none;cursor:pointer;border-radius:12px;background:#f26d5b;color:white;padding:12px 18px;font-weight:600;"
        >
          ${buttonText}
        </button>
      </div>
    </div>
  `;
}

function safeCapture(eventName: string, properties: Record<string, unknown>) {
  try {
    posthog?.capture(eventName, properties);
  } catch {
    // Never let analytics failures impact rendering
  }
}

function installGlobalErrorHandlers(rootElement: HTMLElement) {
  if (typeof window === "undefined") return;

  const handleChunkFailure = () => {
    renderStartupFallback(
      rootElement,
      "We just shipped an update.",
      "Please reload to get the newest version and continue where you left off.",
      "Reload",
    );
  };

  window.addEventListener("error", (event) => {
    safeCapture("js_error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    const errorMessage =
      typeof event.message === "string"
        ? event.message
        : event.error instanceof Error
          ? event.error.message
          : "";
    if (CHUNK_LOAD_ERROR_PATTERN.test(errorMessage)) {
      handleChunkFailure();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    safeCapture("unhandled_promise_rejection", { reason });

    if (CHUNK_LOAD_ERROR_PATTERN.test(reason)) {
      handleChunkFailure();
    }
  });
}

function bootApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  try {
    initSentry();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Sentry initialization failed:", error);
    }
  }

  installGlobalErrorHandlers(rootElement);

  let router: ReturnType<typeof getRouter>;
  try {
    router = getRouter();
  } catch (error) {
    renderStartupFallback(
      rootElement,
      "We hit a loading snag.",
      "Please reload and we'll get you back to your baby portrait in a moment.",
    );
    if (import.meta.env.DEV) {
      console.error("Router initialization failed:", error);
    }
    return;
  }

  let lastTrackedPath =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "";

  // Fire FB Pixel PageView on SPA navigations
  // (Initial PageView already fires from inline script in index.html)
  router.subscribe("onResolved", ({ pathChanged }) => {
    if (!pathChanged || typeof window === "undefined") return;

    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath === lastTrackedPath) return;

    lastTrackedPath = currentPath;

    try {
      trackFBPageView();
    } catch {
      // Ignore pixel errors to keep app resilient
    }
  });

  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <PostHogProvider>
            <RouterProvider router={router} />
          </PostHogProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (error) {
    renderStartupFallback(
      rootElement,
      "Something interrupted loading.",
      "Please reload and we'll pick things up from there.",
    );
    if (import.meta.env.DEV) {
      console.error("App render failed:", error);
    }
    return;
  }

  try {
    // Initialize performance monitoring (Web Vitals -> PostHog)
    initPerformanceMonitoring();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Performance monitoring init failed:", error);
    }
  }
}

bootApp();
