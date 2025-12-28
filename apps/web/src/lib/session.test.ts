import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  storeSession,
  getSession,
  getCurrentJob,
  clearSession,
  hasSession,
  getSessionHeader,
  getJobData,
  updateJobStatus,
  updateJobResult,
  getPendingJob,
  getCompletedJobNeedingRedirect,
  clearStaleSessions,
  SESSION_PREFIX,
  CURRENT_JOB_KEY,
  JOB_DATA_PREFIX,
  SESSION_TTL_MS,
} from "./session";

// =============================================================================
// Session Storage Tests (Story 3.6 + Story 5.7)
// =============================================================================

describe("Session Storage Utilities", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("storeSession", () => {
    it("should store session token with correct key format", () => {
      storeSession("job-123", "token-abc");

      expect(localStorage.getItem(`${SESSION_PREFIX}job-123`)).toBe("token-abc");
    });

    it("should update current job reference", () => {
      storeSession("job-123", "token-abc");

      expect(localStorage.getItem(CURRENT_JOB_KEY)).toBe("job-123");
    });

    it("should overwrite previous session for same job", () => {
      storeSession("job-123", "token-old");
      storeSession("job-123", "token-new");

      expect(localStorage.getItem(`${SESSION_PREFIX}job-123`)).toBe("token-new");
    });

    it("should handle localStorage errors gracefully", () => {
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      // Should not throw
      expect(() => storeSession("job-123", "token-abc")).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });

  describe("getSession", () => {
    it("should retrieve stored session token", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc");

      expect(getSession("job-123")).toBe("token-abc");
    });

    it("should return null for non-existent session", () => {
      expect(getSession("non-existent")).toBeNull();
    });

    it("should handle localStorage errors gracefully", () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error("Storage access denied");
      });

      expect(getSession("job-123")).toBeNull();

      localStorage.getItem = originalGetItem;
    });
  });

  describe("getCurrentJob", () => {
    it("should return current job ID", () => {
      localStorage.setItem(CURRENT_JOB_KEY, "job-456");

      expect(getCurrentJob()).toBe("job-456");
    });

    it("should return null when no current job", () => {
      expect(getCurrentJob()).toBeNull();
    });
  });

  describe("clearSession", () => {
    it("should remove session token for job", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc");

      clearSession("job-123");

      expect(localStorage.getItem(`${SESSION_PREFIX}job-123`)).toBeNull();
    });

    it("should clear current job if it matches", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc");
      localStorage.setItem(CURRENT_JOB_KEY, "job-123");

      clearSession("job-123");

      expect(localStorage.getItem(CURRENT_JOB_KEY)).toBeNull();
    });

    it("should not clear current job if it does not match", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc");
      localStorage.setItem(CURRENT_JOB_KEY, "job-456");

      clearSession("job-123");

      expect(localStorage.getItem(CURRENT_JOB_KEY)).toBe("job-456");
    });
  });

  describe("hasSession", () => {
    it("should return true when session exists", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc");

      expect(hasSession("job-123")).toBe(true);
    });

    it("should return false when session does not exist", () => {
      expect(hasSession("non-existent")).toBe(false);
    });
  });

  describe("getSessionHeader", () => {
    it("should return header object with token", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc");

      expect(getSessionHeader("job-123")).toEqual({
        "X-Session-Token": "token-abc",
      });
    });

    it("should return null when no session exists", () => {
      expect(getSessionHeader("non-existent")).toBeNull();
    });
  });

  describe("Session Token Uniqueness", () => {
    it("should store unique tokens for different jobs", () => {
      storeSession("job-1", "token-1");
      storeSession("job-2", "token-2");
      storeSession("job-3", "token-3");

      expect(getSession("job-1")).toBe("token-1");
      expect(getSession("job-2")).toBe("token-2");
      expect(getSession("job-3")).toBe("token-3");
    });

    it("should track most recent job as current", () => {
      storeSession("job-1", "token-1");
      storeSession("job-2", "token-2");

      expect(getCurrentJob()).toBe("job-2");
    });
  });
});

// =============================================================================
// Session Recovery Tests (Story 5.7)
// =============================================================================

describe("Session Recovery (Story 5.7)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getJobData", () => {
    it("should return job data when stored", () => {
      storeSession("job-123", "token-abc");

      const data = getJobData("job-123");
      expect(data).not.toBeNull();
      expect(data?.jobId).toBe("job-123");
      expect(data?.token).toBe("token-abc");
      expect(data?.status).toBe("pending");
      expect(data?.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it("should return null for non-existent job", () => {
      expect(getJobData("non-existent")).toBeNull();
    });

    it("should return null and clear expired job (TTL enforcement)", () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      storeSession("job-123", "token-abc");

      // Advance time past TTL
      vi.setSystemTime(now + SESSION_TTL_MS + 1000);

      const data = getJobData("job-123");
      expect(data).toBeNull();

      // Session should be cleared
      expect(getSession("job-123")).toBeNull();
    });
  });

  describe("updateJobStatus", () => {
    it("should update job status", () => {
      storeSession("job-123", "token-abc");

      updateJobStatus("job-123", "processing");

      const data = getJobData("job-123");
      expect(data?.status).toBe("processing");
    });

    it("should not throw for non-existent job", () => {
      expect(() => updateJobStatus("non-existent", "processing")).not.toThrow();
    });
  });

  describe("updateJobResult", () => {
    it("should store resultId and set status to completed", () => {
      storeSession("job-123", "token-abc");

      updateJobResult("job-123", "result-456");

      const data = getJobData("job-123");
      expect(data?.resultId).toBe("result-456");
      expect(data?.status).toBe("completed");
    });
  });

  describe("getPendingJob", () => {
    it("should return pending job", () => {
      storeSession("job-123", "token-abc");

      const pending = getPendingJob();
      expect(pending).not.toBeNull();
      expect(pending?.jobId).toBe("job-123");
      expect(pending?.status).toBe("pending");
    });

    it("should return processing job", () => {
      storeSession("job-123", "token-abc");
      updateJobStatus("job-123", "processing");

      const pending = getPendingJob();
      expect(pending?.status).toBe("processing");
    });

    it("should return completed job with resultId for redirect", () => {
      storeSession("job-123", "token-abc");
      updateJobResult("job-123", "result-456");

      const pending = getPendingJob();
      expect(pending?.status).toBe("completed");
      expect(pending?.resultId).toBe("result-456");
    });

    it("should return null when no current job", () => {
      expect(getPendingJob()).toBeNull();
    });

    it("should return null for failed job", () => {
      storeSession("job-123", "token-abc");
      updateJobStatus("job-123", "failed");

      expect(getPendingJob()).toBeNull();
    });
  });

  describe("getCompletedJobNeedingRedirect", () => {
    it("should return completed job with resultId", () => {
      storeSession("job-123", "token-abc");
      updateJobResult("job-123", "result-456");

      const completed = getCompletedJobNeedingRedirect();
      expect(completed).not.toBeNull();
      expect(completed?.resultId).toBe("result-456");
    });

    it("should return null for pending job", () => {
      storeSession("job-123", "token-abc");

      expect(getCompletedJobNeedingRedirect()).toBeNull();
    });

    it("should return null for processing job", () => {
      storeSession("job-123", "token-abc");
      updateJobStatus("job-123", "processing");

      expect(getCompletedJobNeedingRedirect()).toBeNull();
    });
  });

  describe("clearStaleSessions", () => {
    it("should clear sessions older than TTL", () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      // Create old session
      storeSession("old-job", "old-token");

      // Advance time past TTL
      vi.setSystemTime(now + SESSION_TTL_MS + 1000);

      // Create new session
      storeSession("new-job", "new-token");

      clearStaleSessions();

      // Old session should be cleared
      expect(getSession("old-job")).toBeNull();
      expect(getJobData("old-job")).toBeNull();

      // New session should remain
      expect(getSession("new-job")).toBe("new-token");
      expect(getJobData("new-job")).not.toBeNull();
    });

    it("should clear current job reference if it was stale", () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      storeSession("stale-job", "token");

      // Advance time past TTL
      vi.setSystemTime(now + SESSION_TTL_MS + 1000);

      clearStaleSessions();

      expect(getCurrentJob()).toBeNull();
    });

    it("should handle invalid JSON gracefully", () => {
      localStorage.setItem(`${JOB_DATA_PREFIX}bad-job`, "not-json");

      expect(() => clearStaleSessions()).not.toThrow();

      // Invalid entry should be removed
      expect(localStorage.getItem(`${JOB_DATA_PREFIX}bad-job`)).toBeNull();
    });
  });

  describe("clearSession (enhanced)", () => {
    it("should clear job data along with session", () => {
      storeSession("job-123", "token-abc");

      clearSession("job-123");

      expect(getSession("job-123")).toBeNull();
      expect(getJobData("job-123")).toBeNull();
    });
  });
});
