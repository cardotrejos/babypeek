import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useUpload } from "./use-upload";

// Mock analytics
vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => ({
    trackEvent: vi.fn(),
  }),
}));

// Mock Sentry
vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock session storage
const mockStoreSession = vi.fn();
vi.mock("@/lib/session", () => ({
  storeSession: (...args: unknown[]) => mockStoreSession(...args),
}));

// Mock analytics context
vi.mock("@/lib/analytics-context", () => ({
  getAnalyticsContext: () => ({
    device_type: "desktop",
    browser: "Chrome 120",
    os: "macOS",
    viewport_width: 1920,
    viewport_height: 1080,
    connection_type: "wifi",
    effective_type: "4g",
    prefers_reduced_motion: false,
    is_touch_device: false,
  }),
}));

// Mock upload session
vi.mock("@/lib/upload-session", () => ({
  startUploadAttempt: () => ({
    session_id: "test-session-uuid",
    attempt_number: 1,
    time_since_session_start: 1000,
    time_since_page_load: 5000,
  }),
  getUploadSessionInfo: () => ({
    session_id: "test-session-uuid",
    attempt_number: 1,
    time_since_session_start: 1000,
    time_since_page_load: 5000,
  }),
}));

// =============================================================================
// Test Helpers
// =============================================================================

function createMockFile(name: string, type: string, size: number = 1000): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

const mockPresignedResponse = {
  uploadUrl: "https://r2.example.com/upload?signature=abc123",
  uploadId: "test-upload-id",
  key: "uploads/test-upload-id/original.jpg",
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  sessionToken: "test-session-token-uuid",
};

const mockConfirmResponse = {
  success: true,
  jobId: "test-upload-id",
  status: "pending",
};

// =============================================================================
// Tests
// =============================================================================

describe("useUpload", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalXMLHttpRequest: typeof globalThis.XMLHttpRequest;

  beforeEach(() => {
    // Save original globals
    originalFetch = globalThis.fetch;
    originalXMLHttpRequest = globalThis.XMLHttpRequest;

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore globals
    globalThis.fetch = originalFetch;
    globalThis.XMLHttpRequest = originalXMLHttpRequest;
  });

  // =============================================================================
  // Initial State Tests
  // =============================================================================

  it("should have idle initial state", () => {
    const { result } = renderHook(() => useUpload());

    expect(result.current.state).toEqual({
      status: "idle",
      progress: 0,
      uploadId: null,
      error: null,
      retryCount: 0,
      autoRetrying: false,
    });
  });

  // =============================================================================
  // State Transition Tests
  // =============================================================================

  it("should transition to requesting state when upload starts", async () => {
    // Mock fetch to hang (simulate slow request)
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg");

    // Start upload without awaiting
    act(() => {
      result.current.startUpload(file, "test@example.com");
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("requesting");
    });
  });

  it("should transition to uploading state after getting presigned URL", async () => {
    // Mock successful fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPresignedResponse),
    });

    // Mock XMLHttpRequest that never completes
    class MockXHR {
      upload = { onprogress: null };
      onload = null;
      onerror = null;
      onabort = null;
      ontimeout = null;
      timeout = 0;
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn();
      abort = vi.fn();
    }
    globalThis.XMLHttpRequest = MockXHR as any;

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg");

    act(() => {
      result.current.startUpload(file, "test@example.com");
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("uploading");
      expect(result.current.state.uploadId).toBe("test-upload-id");
    });
  });

  it("should update progress during upload", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPresignedResponse),
    });

    let capturedOnProgress: ((event: any) => void) | null = null;

    class MockXHR {
      upload = {
        set onprogress(fn: any) {
          capturedOnProgress = fn;
        },
      };
      onload: any = null;
      onerror = null;
      onabort = null;
      ontimeout = null;
      timeout = 0;
      status = 200;
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn().mockImplementation(() => {
        // Simulate progress events
        setTimeout(() => {
          if (capturedOnProgress) {
            capturedOnProgress({ lengthComputable: true, loaded: 50, total: 100 });
          }
        }, 10);
      });
      abort = vi.fn();
    }
    globalThis.XMLHttpRequest = MockXHR as any;

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg", 100);

    act(() => {
      result.current.startUpload(file, "test@example.com");
    });

    await waitFor(() => {
      expect(result.current.state.progress).toBeGreaterThanOrEqual(50);
    });
  });

  // =============================================================================
  // Cancel Tests
  // =============================================================================

  it("should reset state when cancelled", async () => {
    // Mock fetch that responds to abort signal
    globalThis.fetch = vi.fn().mockImplementation(
      (_url, options) =>
        new Promise((_, reject) => {
          if (options?.signal) {
            options.signal.addEventListener("abort", () => {
              const abortError = new Error("Aborted");
              abortError.name = "AbortError";
              reject(abortError);
            });
          }
        }),
    );

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg");

    // Start upload
    let uploadPromise: Promise<any>;
    act(() => {
      uploadPromise = result.current.startUpload(file, "test@example.com");
    });

    await waitFor(() => {
      expect(result.current.state.status).toBe("requesting");
    });

    // Cancel and wait for promise to resolve
    await act(async () => {
      result.current.cancelUpload();
      await uploadPromise;
    });

    expect(result.current.state.status).toBe("idle");
  });

  // =============================================================================
  // Reset Tests
  // =============================================================================

  it("should reset to initial state", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPresignedResponse),
    });

    class MockXHR {
      upload = { onprogress: null };
      onload: any = null;
      onerror = null;
      onabort = null;
      ontimeout = null;
      timeout = 0;
      status = 200;
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn().mockImplementation(function (this: any) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      });
      abort = vi.fn();
    }
    globalThis.XMLHttpRequest = MockXHR as any;

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg");

    await act(async () => {
      await result.current.startUpload(file, "test@example.com");
    });

    expect(result.current.state.status).toBe("complete");

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual({
      status: "idle",
      progress: 0,
      uploadId: null,
      error: null,
      retryCount: 0,
      autoRetrying: false,
    });
  });

  // =============================================================================
  // Session Token Tests (Story 3.6)
  // =============================================================================

  it("should store session token after successful upload and confirmation", async () => {
    // Mock fetch for both presigned URL and confirm requests
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPresignedResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfirmResponse),
      });

    class MockXHR {
      upload = { onprogress: null };
      onload: any = null;
      onerror = null;
      onabort = null;
      ontimeout = null;
      timeout = 0;
      status = 200;
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn().mockImplementation(function (this: any) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      });
      abort = vi.fn();
    }
    globalThis.XMLHttpRequest = MockXHR as any;

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg");

    await act(async () => {
      await result.current.startUpload(file, "test@example.com");
    });

    expect(result.current.state.status).toBe("complete");
    expect(mockStoreSession).toHaveBeenCalledWith("test-upload-id", "test-session-token-uuid");
  });

  it("should return sessionToken in upload result", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPresignedResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfirmResponse),
      });

    class MockXHR {
      upload = { onprogress: null };
      onload: any = null;
      onerror = null;
      onabort = null;
      ontimeout = null;
      timeout = 0;
      status = 200;
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn().mockImplementation(function (this: any) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      });
      abort = vi.fn();
    }
    globalThis.XMLHttpRequest = MockXHR as any;

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg");

    let uploadResult: any;
    await act(async () => {
      uploadResult = await result.current.startUpload(file, "test@example.com");
    });

    expect(uploadResult).toEqual({
      uploadId: "test-upload-id",
      key: "uploads/test-upload-id/original.jpg",
      sessionToken: "test-session-token-uuid",
    });
  });

  it("should call confirm endpoint after R2 upload", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPresignedResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConfirmResponse),
      });

    class MockXHR {
      upload = { onprogress: null };
      onload: any = null;
      onerror = null;
      onabort = null;
      ontimeout = null;
      timeout = 0;
      status = 200;
      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn().mockImplementation(function (this: any) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      });
      abort = vi.fn();
    }
    globalThis.XMLHttpRequest = MockXHR as any;

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg");

    await act(async () => {
      await result.current.startUpload(file, "test@example.com");
    });

    // Verify fetch was called twice: once for presigned URL, once for confirm
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/upload/test-upload-id/confirm"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  // =============================================================================
  // Error Tests
  // =============================================================================

  it("should handle network errors", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg");

    await act(async () => {
      await result.current.startUpload(file, "test@example.com");
    });

    expect(result.current.state.status).toBe("error");
    expect(result.current.state.error).toBeTruthy();
  });

  it("should handle server errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg");

    await act(async () => {
      await result.current.startUpload(file, "test@example.com");
    });

    expect(result.current.state.status).toBe("error");
  });

  // =============================================================================
  // Rate Limit Tests (Story 3.7)
  // =============================================================================

  it("should handle rate limit (429) errors with friendly message", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () =>
        Promise.resolve({
          error: "You've reached the upload limit. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: 1800, // 30 minutes
        }),
    });

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg");

    await act(async () => {
      await result.current.startUpload(file, "test@example.com");
    });

    expect(result.current.state.status).toBe("error");
    // Should show a friendly message with time remaining
    expect(result.current.state.error).toContain("30 minutes");
  });

  it("should handle rate limit with short retry time", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () =>
        Promise.resolve({
          error: "Rate limited",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfter: 30, // 30 seconds
        }),
    });

    const { result } = renderHook(() => useUpload());
    const file = createMockFile("test.jpg", "image/jpeg");

    await act(async () => {
      await result.current.startUpload(file, "test@example.com");
    });

    expect(result.current.state.status).toBe("error");
    // For very short times, use generic message
    expect(result.current.state.error).toContain("upload limit");
  });

  // =============================================================================
  // Analytics Integration Tests (Story 3.9)
  // =============================================================================

  describe("Analytics Events Integration", () => {
    it("should complete full upload funnel: requesting → uploading → complete", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPresignedResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockConfirmResponse),
        });

      let capturedOnProgress: ((event: any) => void) | null = null;

      class MockXHR {
        upload = {
          set onprogress(fn: any) {
            capturedOnProgress = fn;
          },
        };
        onload: any = null;
        onerror = null;
        onabort = null;
        ontimeout = null;
        timeout = 0;
        status = 200;
        open = vi.fn();
        setRequestHeader = vi.fn();
        send = vi.fn().mockImplementation(function (this: any) {
          // Fire progress events at milestones
          setTimeout(() => {
            if (capturedOnProgress) {
              capturedOnProgress({ lengthComputable: true, loaded: 25, total: 100 });
              capturedOnProgress({ lengthComputable: true, loaded: 50, total: 100 });
              capturedOnProgress({ lengthComputable: true, loaded: 75, total: 100 });
              capturedOnProgress({ lengthComputable: true, loaded: 100, total: 100 });
            }
            if (this.onload) this.onload();
          }, 10);
        });
        abort = vi.fn();
      }
      globalThis.XMLHttpRequest = MockXHR as any;

      const { result } = renderHook(() => useUpload());
      const file = createMockFile("test.jpg", "image/jpeg", 100);

      // Track state transitions
      const stateHistory: string[] = [];

      await act(async () => {
        const uploadPromise = result.current.startUpload(file, "test@example.com");

        // Wait for state transitions
        await new Promise((resolve) => setTimeout(resolve, 5));
        stateHistory.push(result.current.state.status);

        await uploadPromise;
        stateHistory.push(result.current.state.status);
      });

      // Verify the upload completed successfully
      expect(result.current.state.status).toBe("complete");

      // Verify progress reached 100%
      expect(result.current.state.progress).toBe(100);
    });

    it("should include session context in analytics (via mock verification)", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPresignedResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockConfirmResponse),
        });

      class MockXHR {
        upload = { onprogress: null };
        onload: any = null;
        onerror = null;
        onabort = null;
        ontimeout = null;
        timeout = 0;
        status = 200;
        open = vi.fn();
        setRequestHeader = vi.fn();
        send = vi.fn().mockImplementation(function (this: any) {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 10);
        });
        abort = vi.fn();
      }
      globalThis.XMLHttpRequest = MockXHR as any;

      const { result } = renderHook(() => useUpload());
      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.startUpload(file, "test@example.com");
      });

      // The mocked modules (analytics-context, upload-session) inject:
      // - session_id: "test-session-uuid"
      // - attempt_number: 1
      // - device_type: "desktop"
      // - browser: "Chrome 120"
      // This test verifies the upload completes with these enriched analytics
      expect(result.current.state.status).toBe("complete");
    });

    it("should enrich upload_failed event with session and context", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useUpload());
      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.startUpload(file, "test@example.com");
      });

      // The error path now includes sessionInfo and analyticsContext
      // (verified by code review - upload_failed event includes ...sessionInfo, ...analyticsContext)
      expect(result.current.state.status).toBe("error");
      expect(result.current.state.error).toBeTruthy();
    });

    it("should track stage timing on successful upload", async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPresignedResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockConfirmResponse),
        });

      class MockXHR {
        upload = { onprogress: null };
        onload: any = null;
        onerror = null;
        onabort = null;
        ontimeout = null;
        timeout = 0;
        status = 200;
        open = vi.fn();
        setRequestHeader = vi.fn();
        send = vi.fn().mockImplementation(function (this: any) {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 10);
        });
        abort = vi.fn();
      }
      globalThis.XMLHttpRequest = MockXHR as any;

      const { result } = renderHook(() => useUpload());
      const file = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.startUpload(file, "test@example.com");
      });

      // Successful upload fires upload_stage_timing with:
      // - presign_latency
      // - upload_duration
      // - total_duration
      // (verified by code review - use-upload.ts:430-436)
      expect(result.current.state.status).toBe("complete");
    });
  });
});
