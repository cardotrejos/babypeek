// =============================================================================
// Session Storage Utilities
// =============================================================================
// Manages localStorage-based job tracking for session recovery
// Story 5.7: Enhanced with TTL, result tracking, and recovery support

export const CURRENT_JOB_KEY = "babypeek-current-job";
export const JOB_DATA_PREFIX = "babypeek-job-";

// 24-hour TTL for session data
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Job data stored for session recovery (Story 5.7)
 */
export interface JobData {
  jobId: string;
  createdAt: number;
  resultId?: string;
  status?: "pending" | "processing" | "completed" | "failed";
  selectedTier?: string;
}

/**
 * Initialize job tracking data for session recovery.
 * Authentication is handled by Better Auth cookies.
 */
export function initializeJobTracking(jobId: string): void {
  try {
    localStorage.setItem(CURRENT_JOB_KEY, jobId);

    // Store job metadata for recovery
    const jobData: JobData = {
      jobId,
      createdAt: Date.now(),
      status: "pending",
    };
    localStorage.setItem(`${JOB_DATA_PREFIX}${jobId}`, JSON.stringify(jobData));
  } catch (error) {
    // Silent fail - localStorage may not be available (SSR, private browsing)
    console.warn("Failed to initialize job tracking:", error);
  }
}

/**
 * Get the current job ID (for session recovery)
 */
export function getCurrentJob(): string | null {
  try {
    return localStorage.getItem(CURRENT_JOB_KEY);
  } catch {
    return null;
  }
}

/** Clear job tracking for a specific job */
export function clearSession(jobId: string): void {
  try {
    localStorage.removeItem(`${JOB_DATA_PREFIX}${jobId}`);
    const current = getCurrentJob();
    if (current === jobId) {
      localStorage.removeItem(CURRENT_JOB_KEY);
    }
  } catch {
    // Silent fail
  }
}

// =============================================================================
// Session Recovery (Story 5.7)
// =============================================================================

/**
 * Get job data with TTL enforcement (Story 5.7: AC4, AC7)
 * Returns null if job data is expired (>24h old) or doesn't exist
 */
export function getJobData(jobId: string): JobData | null {
  try {
    const raw = localStorage.getItem(`${JOB_DATA_PREFIX}${jobId}`);
    if (!raw) return null;

    const data = JSON.parse(raw) as JobData;

    // Enforce TTL (Story 5.7: AC7)
    if (Date.now() - data.createdAt > SESSION_TTL_MS) {
      clearSession(jobId);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Update job status (Story 5.7: AC2, AC3)
 */
export function updateJobStatus(jobId: string, status: JobData["status"]): void {
  try {
    const data = getJobData(jobId);
    if (data) {
      data.status = status;
      localStorage.setItem(`${JOB_DATA_PREFIX}${jobId}`, JSON.stringify(data));
    }
  } catch {
    // Silent fail
  }
}

/**
 * Store result ID when processing completes (Story 5.7: AC2, AC6)
 */
export function updateJobResult(jobId: string, resultId: string): void {
  try {
    const data = getJobData(jobId);
    if (data) {
      data.resultId = resultId;
      data.status = "completed";
      localStorage.setItem(`${JOB_DATA_PREFIX}${jobId}`, JSON.stringify(data));
    }
  } catch {
    // Silent fail
  }
}

/**
 * Get pending job for session recovery (Story 5.7: AC5, AC6)
 * Returns the current job if it's incomplete and not expired
 */
export function getPendingJob(): JobData | null {
  try {
    const currentJobId = getCurrentJob();
    if (!currentJobId) return null;

    const jobData = getJobData(currentJobId);
    if (!jobData) return null;

    // Return if not yet completed/failed (needs recovery)
    if (jobData.status === "pending" || jobData.status === "processing") {
      return jobData;
    }

    // If completed but not yet shown result, also return for redirect
    if (jobData.status === "completed" && jobData.resultId) {
      return jobData;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if there's a completed job that needs redirect (Story 5.7: AC6)
 */
export function getCompletedJobNeedingRedirect(): JobData | null {
  const pendingJob = getPendingJob();
  if (pendingJob?.status === "completed" && pendingJob.resultId) {
    return pendingJob;
  }
  return null;
}

/**
 * Clear stale sessions (older than 24h) (Story 5.7: AC7)
 * Call this on app initialization
 */
export function clearStaleSessions(): void {
  try {
    const now = Date.now();
    const keysToCheck: string[] = [];

    // Get all localStorage keys (compatible with jsdom)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(JOB_DATA_PREFIX)) {
        keysToCheck.push(key);
      }
    }

    for (const key of keysToCheck) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const data = JSON.parse(raw) as JobData;
          if (now - data.createdAt > SESSION_TTL_MS) {
            // Clear all related data for this job
            localStorage.removeItem(key);
            // Clear current job if it matches
            if (getCurrentJob() === data.jobId) {
              localStorage.removeItem(CURRENT_JOB_KEY);
            }
          }
        } catch {
          // Invalid data, remove it
          localStorage.removeItem(key);
        }
      }
    }
  } catch {
    // Silent fail
  }
}
