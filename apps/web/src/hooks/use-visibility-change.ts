import { useEffect, useCallback, useRef } from "react"

/**
 * Hook to detect page visibility changes (user backgrounds/returns to app)
 * Story 5.7: Mobile Session Recovery
 *
 * @param onVisible - Callback fired when page becomes visible again
 * @param options.onHidden - Optional callback fired when page becomes hidden
 * @param options.enabled - Whether the hook should listen for changes (default: true)
 *
 * @example
 * // Basic usage - refetch on return
 * useVisibilityChange(() => {
 *   refetch()
 * })
 *
 * @example
 * // With hidden callback
 * useVisibilityChange(
 *   () => console.log('visible'),
 *   { onHidden: () => console.log('hidden') }
 * )
 */
export function useVisibilityChange(
  onVisible: () => void,
  options?: {
    onHidden?: () => void
    enabled?: boolean
  }
): void {
  const { onHidden, enabled = true } = options ?? {}

  // Refs to avoid stale closures in event handler
  const onVisibleRef = useRef(onVisible)
  const onHiddenRef = useRef(onHidden)

  // Update refs when callbacks change
  useEffect(() => {
    onVisibleRef.current = onVisible
    onHiddenRef.current = onHidden
  }, [onVisible, onHidden])

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      onVisibleRef.current()
    } else if (document.visibilityState === "hidden" && onHiddenRef.current) {
      onHiddenRef.current()
    }
  }, [])

  useEffect(() => {
    // Skip if disabled or SSR
    if (!enabled || typeof document === "undefined") return

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [enabled, handleVisibilityChange])
}
