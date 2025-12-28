import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getOrCreateUploadSession,
  incrementAttempt,
  resetUploadSession,
  getUploadSessionInfo,
  startUploadAttempt,
  initializePageLoadTracking,
  getTimeSincePageLoad,
} from "./upload-session";

// =============================================================================
// Mock Setup
// =============================================================================

const mockSessionStorage: Record<string, string> = {};

const mockSessionStorageAPI = {
  getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockSessionStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
  }),
  length: 0,
  key: vi.fn(() => null),
};

// Mock crypto.randomUUID
const mockRandomUUID = vi.fn(() => "mock-uuid-1234-5678-9abc-def012345678");

// =============================================================================
// Session Management Tests
// =============================================================================

describe("Upload Session Management", () => {
  beforeEach(() => {
    // Clear mock storage
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
    vi.clearAllMocks();

    // Mock sessionStorage
    Object.defineProperty(global, "sessionStorage", {
      value: mockSessionStorageAPI,
      writable: true,
      configurable: true,
    });

    // Mock crypto
    Object.defineProperty(global, "crypto", {
      value: { randomUUID: mockRandomUUID },
      writable: true,
      configurable: true,
    });

    // Mock performance
    Object.defineProperty(global, "performance", {
      value: {
        now: vi.fn(() => 1000),
      },
      writable: true,
      configurable: true,
    });

    // Mock Date.now
    vi.spyOn(Date, "now").mockReturnValue(1703000000000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getOrCreateUploadSession", () => {
    it("should create a new session when none exists", () => {
      const session = getOrCreateUploadSession();

      expect(session).toHaveProperty("id");
      expect(session).toHaveProperty("startedAt");
      expect(session).toHaveProperty("attemptCount", 0);
      expect(session).toHaveProperty("lastActivityAt");
    });

    it("should return existing session if not expired", () => {
      // Create initial session
      const session1 = getOrCreateUploadSession();

      // Get session again
      const session2 = getOrCreateUploadSession();

      expect(session1.id).toBe(session2.id);
    });

    it("should create new session if expired (30+ minutes)", () => {
      // Create initial session
      const session1 = getOrCreateUploadSession();

      // Advance time by 31 minutes
      vi.spyOn(Date, "now").mockReturnValue(1703000000000 + 31 * 60 * 1000);

      // Get session again - should be new
      mockRandomUUID.mockReturnValueOnce("new-uuid-different");
      const session2 = getOrCreateUploadSession();

      expect(session1.id).not.toBe(session2.id);
    });

    it("should generate unique session IDs", () => {
      mockRandomUUID.mockReturnValueOnce("uuid-1").mockReturnValueOnce("uuid-2");

      const session1 = getOrCreateUploadSession();
      resetUploadSession();
      const session2 = getOrCreateUploadSession();

      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe("incrementAttempt", () => {
    it("should increment attempt count", () => {
      // First attempt
      const attempt1 = incrementAttempt();
      expect(attempt1).toBe(1);

      // Second attempt
      const attempt2 = incrementAttempt();
      expect(attempt2).toBe(2);

      // Third attempt
      const attempt3 = incrementAttempt();
      expect(attempt3).toBe(3);
    });

    it("should create session if none exists", () => {
      const attempt = incrementAttempt();

      expect(attempt).toBe(1);
      expect(mockSessionStorageAPI.setItem).toHaveBeenCalled();
    });
  });

  describe("resetUploadSession", () => {
    it("should clear the session", () => {
      // Create a session
      getOrCreateUploadSession();
      expect(mockSessionStorageAPI.setItem).toHaveBeenCalled();

      // Reset
      resetUploadSession();
      expect(mockSessionStorageAPI.removeItem).toHaveBeenCalled();
    });
  });

  describe("getUploadSessionInfo", () => {
    it("should return complete session info", () => {
      const info = getUploadSessionInfo();

      expect(info).toHaveProperty("session_id");
      expect(info).toHaveProperty("attempt_number");
      expect(info).toHaveProperty("time_since_session_start");
      expect(info).toHaveProperty("time_since_page_load");
    });

    it("should have correct types", () => {
      const info = getUploadSessionInfo();

      expect(typeof info.session_id).toBe("string");
      expect(typeof info.attempt_number).toBe("number");
      expect(typeof info.time_since_session_start).toBe("number");
      expect(typeof info.time_since_page_load).toBe("number");
    });
  });

  describe("startUploadAttempt", () => {
    it("should increment attempt and return session info", () => {
      const info1 = startUploadAttempt();
      expect(info1.attempt_number).toBe(1);

      const info2 = startUploadAttempt();
      expect(info2.attempt_number).toBe(2);

      // Same session ID
      expect(info1.session_id).toBe(info2.session_id);
    });
  });
});

// =============================================================================
// Page Load Tracking Tests
// =============================================================================

describe("Page Load Tracking", () => {
  beforeEach(() => {
    // Reset module state by reloading
    vi.resetModules();

    Object.defineProperty(global, "performance", {
      value: {
        now: vi.fn(() => 5000),
      },
      writable: true,
      configurable: true,
    });
  });

  it("should track time since page load", () => {
    initializePageLoadTracking();

    // Advance time
    vi.mocked(performance.now).mockReturnValue(10000);

    const elapsed = getTimeSincePageLoad();
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it("should return a number", () => {
    initializePageLoadTracking();
    const elapsed = getTimeSincePageLoad();
    expect(typeof elapsed).toBe("number");
  });
});
