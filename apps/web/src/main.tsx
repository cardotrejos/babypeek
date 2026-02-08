import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import { PostHogProvider, posthog } from "@/lib/posthog";
import { initSentry } from "@/lib/sentry";
import { trackFBPageView } from "@/lib/facebook-pixel";
import { initPerformanceMonitoring } from "@/lib/performance-monitoring";
import "@/index.css";

// Initialize Sentry early
initSentry();

// Forward JS errors to PostHog for funnel correlation
// (Sentry handles detailed error reporting separately)
if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    posthog?.capture("js_error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    posthog?.capture("unhandled_promise_rejection", {
      reason:
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason),
    });
  });
}

const router = getRouter();
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
  trackFBPageView();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider>
      <RouterProvider router={router} />
    </PostHogProvider>
  </StrictMode>,
);

// Initialize performance monitoring (Web Vitals -> PostHog)
initPerformanceMonitoring();
