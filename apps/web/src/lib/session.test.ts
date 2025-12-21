import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  storeSession,
  getSession,
  getCurrentJob,
  clearSession,
  hasSession,
  getSessionHeader,
  SESSION_PREFIX,
  CURRENT_JOB_KEY,
} from "./session"

// =============================================================================
// Session Storage Tests (Story 3.6)
// =============================================================================

describe("Session Storage Utilities", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe("storeSession", () => {
    it("should store session token with correct key format", () => {
      storeSession("job-123", "token-abc")

      expect(localStorage.getItem(`${SESSION_PREFIX}job-123`)).toBe("token-abc")
    })

    it("should update current job reference", () => {
      storeSession("job-123", "token-abc")

      expect(localStorage.getItem(CURRENT_JOB_KEY)).toBe("job-123")
    })

    it("should overwrite previous session for same job", () => {
      storeSession("job-123", "token-old")
      storeSession("job-123", "token-new")

      expect(localStorage.getItem(`${SESSION_PREFIX}job-123`)).toBe("token-new")
    })

    it("should handle localStorage errors gracefully", () => {
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error("Storage quota exceeded")
      })

      // Should not throw
      expect(() => storeSession("job-123", "token-abc")).not.toThrow()

      localStorage.setItem = originalSetItem
    })
  })

  describe("getSession", () => {
    it("should retrieve stored session token", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc")

      expect(getSession("job-123")).toBe("token-abc")
    })

    it("should return null for non-existent session", () => {
      expect(getSession("non-existent")).toBeNull()
    })

    it("should handle localStorage errors gracefully", () => {
      const originalGetItem = localStorage.getItem
      localStorage.getItem = vi.fn().mockImplementation(() => {
        throw new Error("Storage access denied")
      })

      expect(getSession("job-123")).toBeNull()

      localStorage.getItem = originalGetItem
    })
  })

  describe("getCurrentJob", () => {
    it("should return current job ID", () => {
      localStorage.setItem(CURRENT_JOB_KEY, "job-456")

      expect(getCurrentJob()).toBe("job-456")
    })

    it("should return null when no current job", () => {
      expect(getCurrentJob()).toBeNull()
    })
  })

  describe("clearSession", () => {
    it("should remove session token for job", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc")

      clearSession("job-123")

      expect(localStorage.getItem(`${SESSION_PREFIX}job-123`)).toBeNull()
    })

    it("should clear current job if it matches", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc")
      localStorage.setItem(CURRENT_JOB_KEY, "job-123")

      clearSession("job-123")

      expect(localStorage.getItem(CURRENT_JOB_KEY)).toBeNull()
    })

    it("should not clear current job if it does not match", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc")
      localStorage.setItem(CURRENT_JOB_KEY, "job-456")

      clearSession("job-123")

      expect(localStorage.getItem(CURRENT_JOB_KEY)).toBe("job-456")
    })
  })

  describe("hasSession", () => {
    it("should return true when session exists", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc")

      expect(hasSession("job-123")).toBe(true)
    })

    it("should return false when session does not exist", () => {
      expect(hasSession("non-existent")).toBe(false)
    })
  })

  describe("getSessionHeader", () => {
    it("should return header object with token", () => {
      localStorage.setItem(`${SESSION_PREFIX}job-123`, "token-abc")

      expect(getSessionHeader("job-123")).toEqual({
        "X-Session-Token": "token-abc",
      })
    })

    it("should return null when no session exists", () => {
      expect(getSessionHeader("non-existent")).toBeNull()
    })
  })

  describe("Session Token Uniqueness", () => {
    it("should store unique tokens for different jobs", () => {
      storeSession("job-1", "token-1")
      storeSession("job-2", "token-2")
      storeSession("job-3", "token-3")

      expect(getSession("job-1")).toBe("token-1")
      expect(getSession("job-2")).toBe("token-2")
      expect(getSession("job-3")).toBe("token-3")
    })

    it("should track most recent job as current", () => {
      storeSession("job-1", "token-1")
      storeSession("job-2", "token-2")

      expect(getCurrentJob()).toBe("job-2")
    })
  })
})
