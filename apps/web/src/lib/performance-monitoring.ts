/**
 * Performance Monitoring
 *
 * Captures Core Web Vitals (LCP, FID, CLS, FCP, TTFB) using the
 * PerformanceObserver API and sends them to PostHog.
 *
 * Called once from main.tsx during app initialization.
 */
import { posthog } from "@/lib/posthog";

// Thresholds from web.dev
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

type MetricName = keyof typeof THRESHOLDS;

function getRating(name: MetricName, value: number): "good" | "needs-improvement" | "poor" {
  const t = THRESHOLDS[name];
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function captureMetric(name: MetricName, value: number): void {
  posthog?.capture("web_vital", {
    metric_name: name,
    metric_value: value,
    metric_rating: getRating(name, value),
  });
}

function captureNavigationMetrics(): void {
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          captureMetric("FCP", Math.round(entry.startTime));
          fcpObserver.disconnect();
        }
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });
  } catch {
    // PerformanceObserver not supported
  }

  try {
    const navObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0] as PerformanceNavigationTiming;
      if (entry) {
        const ttfb = Math.round(entry.responseStart - entry.requestStart);
        if (ttfb >= 0) captureMetric("TTFB", ttfb);
      }
      navObserver.disconnect();
    });
    navObserver.observe({ type: "navigation", buffered: true });
  } catch {
    // PerformanceObserver not supported
  }
}

function captureLCP(): void {
  try {
    let lastLCP: number | null = null;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        lastLCP = Math.round(entry.startTime);
      }
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });

    const reportLCP = () => {
      if (lastLCP !== null) {
        captureMetric("LCP", lastLCP);
        lastLCP = null;
      }
      observer.disconnect();
    };

    addEventListener("keydown", reportLCP, { once: true });
    addEventListener("click", reportLCP, { once: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") reportLCP();
    });
  } catch {
    // PerformanceObserver not supported
  }
}

function captureFID(): void {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        const value = Math.round(fidEntry.processingStart - fidEntry.startTime);
        if (value >= 0) captureMetric("FID", value);
      }
      observer.disconnect();
    });
    observer.observe({ type: "first-input", buffered: true });
  } catch {
    // PerformanceObserver not supported
  }
}

function captureCLS(): void {
  try {
    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries: PerformanceEntry[] = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!shift.hadRecentInput) {
          const first = sessionEntries[0];
          const last = sessionEntries[sessionEntries.length - 1];

          if (
            sessionValue &&
            last &&
            first &&
            entry.startTime - last.startTime < 1000 &&
            entry.startTime - first.startTime < 5000
          ) {
            sessionValue += shift.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = shift.value;
            sessionEntries = [entry];
          }

          if (sessionValue > clsValue) clsValue = sessionValue;
        }
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && clsValue > 0) {
        captureMetric("CLS", Number(clsValue.toFixed(4)));
        observer.disconnect();
      }
    });
  } catch {
    // PerformanceObserver not supported
  }
}

/**
 * Initialize performance monitoring.
 * Safe to call in any environment — no-ops if PerformanceObserver is unavailable.
 */
export function initPerformanceMonitoring(): void {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return;

  captureNavigationMetrics();
  captureLCP();
  captureFID();
  captureCLS();
}
