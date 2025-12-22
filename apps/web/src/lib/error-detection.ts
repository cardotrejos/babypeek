/**
 * Error Detection Utilities
 * Story 8.8: Expired Result Handling
 *
 * Detects error types for appropriate UI handling
 */

/**
 * Check if an error indicates an expired or deleted resource (404)
 * Note: Specifically excludes session-related expiry errors
 */
export function isExpiredError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const lowerMessage = error.message.toLowerCase()

  // Exclude session expiry - that's a different error type
  if (lowerMessage.includes("session")) {
    return false
  }

  const expiredMessages = [
    "not found",
    "no longer available",
    "expired",
    "result not found",
  ]

  return expiredMessages.some((msg) => lowerMessage.includes(msg))
}
