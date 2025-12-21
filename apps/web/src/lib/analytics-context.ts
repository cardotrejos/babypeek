/**
 * Analytics Context Enrichment
 *
 * Provides device, browser, and connection context for analytics events.
 * All information is anonymous and contains no PII.
 */

// =============================================================================
// Types
// =============================================================================

export interface AnalyticsContext {
  /** Device type: mobile, tablet, or desktop */
  device_type: "mobile" | "tablet" | "desktop"
  /** Browser name and version (e.g., "Chrome 120") */
  browser: string
  /** Operating system (e.g., "iOS 17", "Android 14", "Windows 11") */
  os: string
  /** Viewport width in pixels */
  viewport_width: number
  /** Viewport height in pixels */
  viewport_height: number
  /** Connection type if available */
  connection_type: "wifi" | "cellular" | "ethernet" | "unknown"
  /** Effective connection type (4g, 3g, etc.) */
  effective_type: "4g" | "3g" | "2g" | "slow-2g" | "unknown"
  /** Whether user prefers reduced motion */
  prefers_reduced_motion: boolean
  /** Whether user is on a touch device */
  is_touch_device: boolean
}

// =============================================================================
// Network Information API types
// =============================================================================

interface NetworkInformation {
  type?: "bluetooth" | "cellular" | "ethernet" | "none" | "wifi" | "wimax" | "other" | "unknown"
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g"
  downlink?: number
  rtt?: number
  saveData?: boolean
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
}

// =============================================================================
// Device Detection
// =============================================================================

/**
 * Detect device type from user agent
 */
export function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof navigator === "undefined") return "desktop"

  const ua = navigator.userAgent.toLowerCase()

  // Check for tablets first (they often match mobile patterns too)
  if (
    /tablet|ipad|playbook|silk|(android(?!.*mobile))/i.test(ua) ||
    (ua.includes("macintosh") && "ontouchend" in document)
  ) {
    return "tablet"
  }

  // Check for mobile devices
  if (
    /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop|windows phone/i.test(
      ua
    )
  ) {
    return "mobile"
  }

  return "desktop"
}

/**
 * Parse browser name and version from user agent
 */
export function getBrowserInfo(): string {
  if (typeof navigator === "undefined") return "unknown"

  const ua = navigator.userAgent
  let browser = "unknown"
  let version = ""

  // Order matters - check more specific browsers first
  if (ua.includes("Firefox/")) {
    browser = "Firefox"
    version = ua.match(/Firefox\/(\d+)/)?.[1] || ""
  } else if (ua.includes("Edg/")) {
    browser = "Edge"
    version = ua.match(/Edg\/(\d+)/)?.[1] || ""
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome"
    version = ua.match(/Chrome\/(\d+)/)?.[1] || ""
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    browser = "Safari"
    version = ua.match(/Version\/(\d+)/)?.[1] || ""
  } else if (ua.includes("Opera") || ua.includes("OPR/")) {
    browser = "Opera"
    version = ua.match(/(?:Opera|OPR)\/(\d+)/)?.[1] || ""
  }

  return version ? `${browser} ${version}` : browser
}

/**
 * Parse operating system from user agent
 */
export function getOSInfo(): string {
  if (typeof navigator === "undefined") return "unknown"

  const ua = navigator.userAgent

  // iOS
  if (/iPad|iPhone|iPod/.test(ua)) {
    const version = ua.match(/OS (\d+)_/)?.[1]
    return version ? `iOS ${version}` : "iOS"
  }

  // Android
  if (/Android/.test(ua)) {
    const version = ua.match(/Android (\d+)/)?.[1]
    return version ? `Android ${version}` : "Android"
  }

  // Windows
  if (/Windows/.test(ua)) {
    if (ua.includes("Windows NT 10.0")) return "Windows 10/11"
    if (ua.includes("Windows NT 6.3")) return "Windows 8.1"
    if (ua.includes("Windows NT 6.2")) return "Windows 8"
    return "Windows"
  }

  // macOS
  if (/Mac OS X/.test(ua)) {
    const version = ua.match(/Mac OS X (\d+)[._](\d+)/)?.[1]
    return version ? `macOS ${version}` : "macOS"
  }

  // Linux
  if (/Linux/.test(ua)) {
    return "Linux"
  }

  return "unknown"
}

// =============================================================================
// Connection Detection
// =============================================================================

/**
 * Get network connection type
 */
export function getConnectionType(): AnalyticsContext["connection_type"] {
  if (typeof navigator === "undefined") return "unknown"

  const nav = navigator as NavigatorWithConnection
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection

  if (!connection?.type) return "unknown"

  switch (connection.type) {
    case "wifi":
      return "wifi"
    case "cellular":
      return "cellular"
    case "ethernet":
      return "ethernet"
    default:
      return "unknown"
  }
}

/**
 * Get effective connection type (speed estimate)
 */
export function getEffectiveType(): AnalyticsContext["effective_type"] {
  if (typeof navigator === "undefined") return "unknown"

  const nav = navigator as NavigatorWithConnection
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection

  if (!connection?.effectiveType) return "unknown"

  return connection.effectiveType
}

// =============================================================================
// Accessibility & Touch Detection
// =============================================================================

/**
 * Check if user prefers reduced motion
 */
export function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Check if device supports touch
 */
export function getIsTouchDevice(): boolean {
  if (typeof window === "undefined") return false
  return "ontouchstart" in window || navigator.maxTouchPoints > 0
}

// =============================================================================
// Main Context Function
// =============================================================================

/**
 * Get complete analytics context for event enrichment
 *
 * @example
 * ```ts
 * const context = getAnalyticsContext()
 * trackEvent("upload_started", {
 *   file_type: "image/jpeg",
 *   ...context,
 * })
 * ```
 */
export function getAnalyticsContext(): AnalyticsContext {
  return {
    device_type: getDeviceType(),
    browser: getBrowserInfo(),
    os: getOSInfo(),
    viewport_width: typeof window !== "undefined" ? window.innerWidth : 0,
    viewport_height: typeof window !== "undefined" ? window.innerHeight : 0,
    connection_type: getConnectionType(),
    effective_type: getEffectiveType(),
    prefers_reduced_motion: getPrefersReducedMotion(),
    is_touch_device: getIsTouchDevice(),
  }
}
