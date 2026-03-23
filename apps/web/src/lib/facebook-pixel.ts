/**
 * Facebook Pixel Client-Side Tracking
 *
 * This module provides type-safe Facebook Pixel event tracking.
 * The pixel script is loaded on demand via ensureFBPixelLoaded / initFBPixel.
 *
 * Standard Events tracked:
 * - PageView: Automatic on every page load
 * - ViewContent: When user views the result preview
 * - InitiateCheckout: When user clicks "Buy" button
 * - Purchase: After successful payment
 * - Lead: When user submits their email
 *
 * @see https://developers.facebook.com/docs/meta-pixel/reference
 */

// =============================================================================
// Types
// =============================================================================

declare global {
  interface Window {
    fbq: FacebookPixel;
    _fbq?: FacebookPixel;
  }
}

type FacebookPixel = {
  (action: "init", pixelId: string, advancedMatching?: AdvancedMatchingParams): void;
  (action: "track", eventName: StandardEvent, params?: EventParams): void;
  (action: "trackCustom", eventName: string, params?: EventParams): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

/** Advanced matching parameters for better attribution */
interface AdvancedMatchingParams {
  em?: string; // Email (hashed)
  ph?: string; // Phone (hashed)
  fn?: string; // First name
  ln?: string; // Last name
  ct?: string; // City
  st?: string; // State
  zp?: string; // Zip code
  country?: string;
  external_id?: string; // Your user ID
}

/** Standard Facebook Pixel events */
type StandardEvent =
  | "PageView"
  | "ViewContent"
  | "InitiateCheckout"
  | "Purchase"
  | "Lead"
  | "CompleteRegistration"
  | "AddToCart"
  | "AddPaymentInfo"
  | "Search"
  | "Contact"
  | "FindLocation"
  | "Schedule"
  | "StartTrial"
  | "SubmitApplication"
  | "Subscribe";

/** Parameters for standard events */
interface EventParams {
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
  num_items?: number;
  predicted_ltv?: number;
  search_string?: string;
  status?: boolean;
  // Custom properties
  [key: string]: unknown;
}

// =============================================================================
// Configuration
// =============================================================================

const PIXEL_ID = import.meta.env.VITE_FACEBOOK_PIXEL_ID as string | undefined;

const FB_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";
const FB_SCRIPT_LOAD_TIMEOUT_MS = 5000;

let pixelScriptLoadPromise: Promise<boolean> | null = null;
let pixelInitPromise: Promise<boolean> | null = null;
let pixelInitialized = false;
let hasPendingRouteChangePageView = false;

function isValidPixelId(id: string | undefined): id is string {
  return !!id && !id.startsWith("VITE_");
}

function installFbqStub(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { fbq?: FacebookPixel; _fbq?: FacebookPixel };
  if (w.fbq) return;

  const fbqFn = function (this: unknown, ...args: unknown[]) {
    const self = fbqFn as FacebookPixel;
    if (self.callMethod) {
      self.callMethod.apply(self, args as never[]);
    } else {
      self.queue!.push(args);
    }
  } as FacebookPixel;

  if (!w._fbq) w._fbq = fbqFn;
  fbqFn.push = fbqFn;
  fbqFn.loaded = true;
  fbqFn.version = "2.0";
  fbqFn.queue = [];
  w.fbq = fbqFn;
}

function findPixelScript(): HTMLScriptElement | null {
  return document.querySelector('script[data-babypeek-fb-pixel="1"]');
}

function resetPixelLoaderState(script?: HTMLScriptElement | null): void {
  pixelScriptLoadPromise = null;
  if (script?.dataset.babypeekFbPixel === "1") {
    script.remove();
  }
}

function flushPendingRouteChangePageView(): void {
  if (!window.fbq || !hasPendingRouteChangePageView) {
    hasPendingRouteChangePageView = false;
    return;
  }

  hasPendingRouteChangePageView = false;
  window.fbq("track", "PageView");
}

function waitForPixelScript(script: HTMLScriptElement): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;

      window.clearTimeout(timeoutId);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);

      if (loaded) {
        script.dataset.babypeekFbPixelLoaded = "1";
      } else {
        resetPixelLoaderState(script);
      }

      resolve(loaded);
    };

    const onLoad = () => finish(true);
    const onError = () => finish(false);
    const timeoutId = window.setTimeout(() => finish(false), FB_SCRIPT_LOAD_TIMEOUT_MS);

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  });
}

/**
 * Loads the Facebook Pixel base script once. Resolves false if no pixel ID or load fails.
 */
export function ensureFBPixelLoaded(): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(false);
  }
  if (!isValidPixelId(PIXEL_ID)) {
    return Promise.resolve(false);
  }
  if (pixelScriptLoadPromise) {
    return pixelScriptLoadPromise;
  }

  installFbqStub();

  const existing = findPixelScript();
  if (existing?.dataset.babypeekFbPixelLoaded === "1") {
    pixelScriptLoadPromise = Promise.resolve(true);
    return pixelScriptLoadPromise;
  }

  if (existing) {
    pixelScriptLoadPromise = waitForPixelScript(existing);
    return pixelScriptLoadPromise;
  }

  const first = document.getElementsByTagName("script")[0];
  const parent = first?.parentNode;
  if (!parent) {
    return Promise.resolve(false);
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = FB_SCRIPT_SRC;
  script.dataset.babypeekFbPixel = "1";
  parent.insertBefore(script, first);

  pixelScriptLoadPromise = waitForPixelScript(script);

  return pixelScriptLoadPromise;
}

/**
 * Initializes the pixel (loads script if needed), runs fbq init, and tracks the first PageView.
 */
export function initFBPixel(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (!isValidPixelId(PIXEL_ID)) {
    return Promise.resolve(false);
  }
  if (pixelInitialized) {
    return Promise.resolve(true);
  }
  if (pixelInitPromise) {
    return pixelInitPromise;
  }

  pixelInitPromise = (async () => {
    const loaded = await ensureFBPixelLoaded();
    if (!loaded || !window.fbq) {
      pixelInitPromise = null;
      return false;
    }

    try {
      window.fbq("init", PIXEL_ID);
      window.fbq("track", "PageView");
      pixelInitialized = true;
      flushPendingRouteChangePageView();
      return true;
    } catch (error) {
      pixelInitPromise = null;
      console.error("[FB Pixel] init failed:", error);
      return false;
    }
  })();

  return pixelInitPromise;
}

/**
 * Check if Facebook Pixel is configured and available
 */
export function isFBPixelConfigured(): boolean {
  return (
    isValidPixelId(PIXEL_ID) &&
    typeof window !== "undefined" &&
    !!window.fbq &&
    pixelInitialized
  );
}

/**
 * Get the configured Pixel ID
 */
export function getPixelId(): string | undefined {
  return PIXEL_ID;
}

// =============================================================================
// Core Tracking Functions
// =============================================================================

/**
 * Track a standard Facebook Pixel event
 */
export function trackFBEvent(eventName: StandardEvent, params?: EventParams): void {
  if (!isFBPixelConfigured()) {
    if (import.meta.env.DEV) {
      console.log(`[FB Pixel] Would track: ${eventName}`, params);
    }
    return;
  }

  try {
    window.fbq("track", eventName, params);
  } catch (error) {
    console.error("[FB Pixel] Error tracking event:", error);
  }
}

/**
 * Track a custom event (for events not in the standard list)
 */
export function trackFBCustomEvent(eventName: string, params?: EventParams): void {
  if (!isFBPixelConfigured()) {
    if (import.meta.env.DEV) {
      console.log(`[FB Pixel] Would track custom: ${eventName}`, params);
    }
    return;
  }

  try {
    window.fbq("trackCustom", eventName, params);
  } catch (error) {
    console.error("[FB Pixel] Error tracking custom event:", error);
  }
}

// =============================================================================
// Specialized Tracking Functions (for your specific use cases)
// =============================================================================

/**
 * Track when user views their result preview
 * Maps to ViewContent standard event
 */
export function trackFBViewContent(params: {
  resultId: string;
  uploadId?: string;
  contentName?: string;
}): void {
  trackFBEvent("ViewContent", {
    content_name: params.contentName ?? "Baby Portrait Preview",
    content_category: "AI Portrait",
    content_ids: [params.resultId],
    content_type: "product",
    value: 9.99,
    currency: "USD",
    upload_id: params.uploadId,
  });
}

/**
 * Track when user initiates checkout (clicks Buy button)
 * Maps to InitiateCheckout standard event
 */
export function trackFBInitiateCheckout(params: {
  resultId: string;
  uploadId?: string;
  value?: number;
  retryCount?: number;
}): void {
  trackFBEvent("InitiateCheckout", {
    content_name: "Baby Portrait HD",
    content_category: "AI Portrait",
    content_ids: [params.resultId],
    content_type: "product",
    value: params.value ?? 9.99,
    currency: "USD",
    num_items: 1,
    upload_id: params.uploadId,
    retry_count: params.retryCount,
  });
}

/**
 * Track successful purchase
 * Maps to Purchase standard event
 *
 * This is the most important event for ad optimization!
 */
export function trackFBPurchase(params: {
  value: number;
  uploadId?: string;
  sessionId?: string;
  transactionId?: string;
}): void {
  trackFBEvent("Purchase", {
    content_name: "Baby Portrait HD",
    content_category: "AI Portrait",
    content_type: "product",
    value: params.value,
    currency: "USD",
    num_items: 1,
    upload_id: params.uploadId,
    session_id: params.sessionId,
    transaction_id: params.transactionId,
  });
}

/**
 * Track when user submits email (lead capture)
 * Maps to Lead standard event
 */
export function trackFBLead(params: { uploadId?: string; source?: string }): void {
  trackFBEvent("Lead", {
    content_name: "Email Capture",
    content_category: "Upload Flow",
    value: 0, // Lead value (can be adjusted based on your analytics)
    currency: "USD",
    upload_id: params.uploadId,
    source: params.source ?? "upload_form",
  });
}

/**
 * Track page view (called from router)
 * Usually automatic, but useful for SPAs
 */
export function trackFBPageView(): void {
  if (isFBPixelConfigured()) {
    trackFBEvent("PageView");
    return;
  }

  if (!isValidPixelId(PIXEL_ID) || typeof window === "undefined") {
    trackFBEvent("PageView");
    return;
  }

  hasPendingRouteChangePageView = true;
  void initFBPixel();
}

// =============================================================================
// Event ID Generation (for deduplication with Conversions API)
// =============================================================================

/**
 * Generate a unique event ID for deduplication between
 * client-side Pixel and server-side Conversions API
 */
export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Track Purchase with event ID for server-side deduplication
 */
export function trackFBPurchaseWithEventId(params: {
  value: number;
  eventId: string;
  uploadId?: string;
  sessionId?: string;
}): void {
  if (!isFBPixelConfigured()) {
    if (import.meta.env.DEV) {
      console.log("[FB Pixel] Would track Purchase with eventId:", params);
    }
    return;
  }

  try {
    // Facebook Pixel doesn't directly support event_id in trackEvent,
    // but we include it in params for logging/debugging.
    // The actual deduplication happens on Meta's side when both
    // client and server send the same event_id.
    window.fbq("track", "Purchase", {
      content_name: "Baby Portrait HD",
      content_category: "AI Portrait",
      content_type: "product",
      value: params.value,
      currency: "USD",
      num_items: 1,
      upload_id: params.uploadId,
      session_id: params.sessionId,
    });

    // Store event ID for potential server-side verification
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("fb_last_purchase_event_id", params.eventId);
    }
  } catch (error) {
    console.error("[FB Pixel] Error tracking purchase:", error);
  }
}
