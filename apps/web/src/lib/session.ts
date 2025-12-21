// =============================================================================
// Session Storage Utilities
// =============================================================================
// Manages localStorage-based session tokens for upload tracking

export const SESSION_PREFIX = "3d-ultra-session-"
export const CURRENT_JOB_KEY = "3d-ultra-current-job"

/**
 * Store a session token for a specific job
 * Also updates the current job reference for session recovery
 */
export function storeSession(jobId: string, token: string): void {
  try {
    localStorage.setItem(`${SESSION_PREFIX}${jobId}`, token)
    localStorage.setItem(CURRENT_JOB_KEY, jobId)
  } catch (error) {
    // Silent fail - localStorage may not be available (SSR, private browsing)
    console.warn("Failed to store session:", error)
  }
}

/**
 * Retrieve a session token for a specific job
 */
export function getSession(jobId: string): string | null {
  try {
    return localStorage.getItem(`${SESSION_PREFIX}${jobId}`)
  } catch {
    return null
  }
}

/**
 * Get the current job ID (for session recovery)
 */
export function getCurrentJob(): string | null {
  try {
    return localStorage.getItem(CURRENT_JOB_KEY)
  } catch {
    return null
  }
}

/**
 * Clear a session token for a specific job
 * Also clears current job reference if it matches
 */
export function clearSession(jobId: string): void {
  try {
    localStorage.removeItem(`${SESSION_PREFIX}${jobId}`)
    const current = getCurrentJob()
    if (current === jobId) {
      localStorage.removeItem(CURRENT_JOB_KEY)
    }
  } catch {
    // Silent fail
  }
}

/**
 * Check if a session exists for a job
 */
export function hasSession(jobId: string): boolean {
  return getSession(jobId) !== null
}

/**
 * Get session token header value for API requests
 * Returns null if no session exists for the job
 */
export function getSessionHeader(jobId: string): Record<string, string> | null {
  const token = getSession(jobId)
  if (!token) return null
  return { "X-Session-Token": token }
}
