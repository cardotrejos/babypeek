import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { HelmetProvider } from "react-helmet-async";
import { getRouter } from "@/router";
import { PostHogProvider, posthog } from "@/lib/posthog";
import { ErrorBoundary } from "@/components/error-boundary";
import { initSentry } from "@/lib/sentry";
import { initFBPixel, trackFBPageView } from "@/lib/facebook-pixel";
import { scheduleIdleTask } from "@/lib/browser-idle";
import { initializePageLoadTracking } from "@/lib/upload-session";
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
  const wrapper = document.createElement("div");
  wrapper.style.minHeight = "100vh";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";
  wrapper.style.padding = "24px";
  wrapper.style.background = "#fdf8f5";
  wrapper.style.fontFamily = '"DM Sans",system-ui,-apple-system,sans-serif';
  wrapper.style.color = "#2f2f2f";
  wrapper.style.textAlign = "center";

  const container = document.createElement("div");
  container.style.maxWidth = "420px";

  const heading = document.createElement("h1");
  heading.style.margin = "0 0 12px 0";
  heading.style.fontSize = "1.6rem";
  heading.style.lineHeight = "1.2";
  heading.textContent = title;

  const body = document.createElement("p");
  body.style.margin = "0 0 20px 0";
  body.style.fontSize = "1rem";
  body.style.lineHeight = "1.5";
  body.style.color = "#5b5b5b";
  body.textContent = description;

  const reloadButton = document.createElement("button");
  reloadButton.type = "button";
  reloadButton.style.border = "none";
  reloadButton.style.cursor = "pointer";
  reloadButton.style.borderRadius = "12px";
  reloadButton.style.background = "#f26d5b";
  reloadButton.style.color = "white";
  reloadButton.style.padding = "12px 18px";
  reloadButton.style.fontWeight = "600";
  reloadButton.textContent = buttonText;
  reloadButton.addEventListener("click", () => {
    window.location.reload();
  });

  container.append(heading, body, reloadButton);
  wrapper.appendChild(container);
  rootElement.replaceChildren(wrapper);
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

  initializePageLoadTracking();

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

  // FB Pixel: first PageView runs in initFBPixel (idle); subsequent navigations here
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
          <HelmetProvider>
            <PostHogProvider>
              <RouterProvider router={router} />
            </PostHogProvider>
          </HelmetProvider>
        </ErrorBoundary>
      </StrictMode>,
    );

    scheduleIdleTask(
      () => {
        void initFBPixel();
      },
      { afterPaint: true, timeoutMs: 2000 },
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
