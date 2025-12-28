/**
 * Device Detection Utilities
 * Story 8.2: iMessage Share Button
 *
 * Detects iOS, Android, and mobile devices for platform-specific sharing.
 */

/**
 * Detects iOS devices (iPhone, iPad, iPod)
 * Also detects iPad with desktop Safari (macOS with touch)
 */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad with iOS 13+ reports as MacIntel but has touch
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Detects Android devices
 */
export function isAndroid(): boolean {
  if (typeof window === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

/**
 * Detects mobile devices (iOS or Android)
 */
export function isMobile(): boolean {
  return isIOS() || isAndroid();
}

/**
 * Returns device type for analytics
 */
export function getDeviceType(): "ios" | "android" | "desktop" {
  if (isIOS()) return "ios";
  if (isAndroid()) return "android";
  return "desktop";
}
