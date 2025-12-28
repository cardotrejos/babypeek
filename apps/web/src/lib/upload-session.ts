/**
 * Upload Session Tracking
 *
 * Tracks upload attempts within a browser session for analytics.
 * Sessions expire after 30 minutes of inactivity.
 */

// =============================================================================
// Constants
// =============================================================================

const UPLOAD_SESSION_KEY = "babypeek-upload-session";
const SESSION_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

// =============================================================================
// Types
// =============================================================================

export interface UploadSession {
  /** Unique session identifier (UUID) */
  id: string;
  /** Timestamp when session started */
  startedAt: number;
  /** Number of upload attempts in this session */
  attemptCount: number;
  /** Last activity timestamp */
  lastActivityAt: number;
}

export interface UploadSessionInfo {
  /** Session ID for event correlation */
  session_id: string;
  /** Current attempt number (1-based) */
  attempt_number: number;
  /** Milliseconds since session started */
  time_since_session_start: number;
  /** Milliseconds since page was loaded */
  time_since_page_load: number;
}

// =============================================================================
// Page Load Tracking
// =============================================================================

let pageLoadTime: number | null = null;

/**
 * Initialize page load time tracking
 * Call this once when the app loads
 */
export function initializePageLoadTracking(): void {
  if (typeof performance !== "undefined" && pageLoadTime === null) {
    pageLoadTime = performance.now();
  }
}

/**
 * Get time since page load in milliseconds
 */
export function getTimeSincePageLoad(): number {
  if (typeof performance === "undefined") return 0;
  if (pageLoadTime === null) {
    pageLoadTime = performance.now();
  }
  return Math.round(performance.now() - pageLoadTime);
}

// =============================================================================
// Session Management
// =============================================================================

/**
 * Generate a UUID v4 for session ID
 */
function generateSessionId(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get existing session from sessionStorage, or null if expired/missing
 */
function getStoredSession(): UploadSession | null {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const stored = sessionStorage.getItem(UPLOAD_SESSION_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as UploadSession;
    const now = Date.now();

    // Check if session has expired
    if (now - session.lastActivityAt >= SESSION_EXPIRY_MS) {
      sessionStorage.removeItem(UPLOAD_SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    // Invalid JSON or other error
    return null;
  }
}

/**
 * Save session to sessionStorage
 */
function saveSession(session: UploadSession): void {
  if (typeof sessionStorage === "undefined") return;

  try {
    sessionStorage.setItem(UPLOAD_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage quota exceeded or other error - continue without persistence
  }
}

/**
 * Create a new upload session
 */
function createSession(): UploadSession {
  const now = Date.now();
  const session: UploadSession = {
    id: generateSessionId(),
    startedAt: now,
    attemptCount: 0,
    lastActivityAt: now,
  };
  saveSession(session);
  return session;
}

/**
 * Get or create an upload session
 * Returns existing session if valid, creates new one if expired/missing
 */
export function getOrCreateUploadSession(): UploadSession {
  const existing = getStoredSession();
  if (existing) {
    // Update last activity time
    existing.lastActivityAt = Date.now();
    saveSession(existing);
    return existing;
  }
  return createSession();
}

/**
 * Increment the attempt count for the current session
 * @returns The new attempt number (1-based)
 */
export function incrementAttempt(): number {
  const session = getOrCreateUploadSession();
  session.attemptCount++;
  session.lastActivityAt = Date.now();
  saveSession(session);
  return session.attemptCount;
}

/**
 * Reset the current session (start fresh)
 */
export function resetUploadSession(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(UPLOAD_SESSION_KEY);
}

// =============================================================================
// Analytics Integration
// =============================================================================

/**
 * Get session info for analytics event enrichment
 *
 * @example
 * ```ts
 * const sessionInfo = getUploadSessionInfo()
 * trackEvent("upload_started", {
 *   file_type: "image/jpeg",
 *   ...sessionInfo,
 * })
 * ```
 */
export function getUploadSessionInfo(): UploadSessionInfo {
  const session = getOrCreateUploadSession();
  const now = Date.now();

  return {
    session_id: session.id,
    attempt_number: session.attemptCount,
    time_since_session_start: now - session.startedAt,
    time_since_page_load: getTimeSincePageLoad(),
  };
}

/**
 * Start a new upload attempt and get session info
 * Increments the attempt counter
 *
 * @example
 * ```ts
 * const sessionInfo = startUploadAttempt()
 * trackEvent("upload_started", {
 *   file_type: "image/jpeg",
 *   ...sessionInfo, // includes incremented attempt_number
 * })
 * ```
 */
export function startUploadAttempt(): UploadSessionInfo {
  const attemptNumber = incrementAttempt();
  const session = getOrCreateUploadSession();
  const now = Date.now();

  return {
    session_id: session.id,
    attempt_number: attemptNumber,
    time_since_session_start: now - session.startedAt,
    time_since_page_load: getTimeSincePageLoad(),
  };
}
