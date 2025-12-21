import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { useStatus, getStageLabel, getStageEmoji } from "./use-status"

// =============================================================================
// Mocks
// =============================================================================

// Mock session module
vi.mock("@/lib/session", () => ({
  getSession: vi.fn((jobId: string) => {
    if (jobId === "no-session-job") return null
    return `session-token-for-${jobId}`
  }),
}))

// Mock analytics
vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => ({
    trackEvent: vi.fn(),
  }),
}))

// Mock API config
vi.mock("@/lib/api-config", () => ({
  API_BASE_URL: "http://localhost:3000",
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// =============================================================================
// Test Wrapper
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("useStatus hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  describe("initialization", () => {
    it("returns initial state when jobId is null", () => {
      const { result } = renderHook(() => useStatus(null), {
        wrapper: createWrapper(),
      })

      expect(result.current.status).toBeNull()
      expect(result.current.stage).toBeNull()
      expect(result.current.progress).toBe(0)
      expect(result.current.resultId).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isComplete).toBe(false)
      expect(result.current.isFailed).toBe(false)
    })

    it("does not fetch when jobId is null", () => {
      renderHook(() => useStatus(null), {
        wrapper: createWrapper(),
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it("does not fetch when session token is missing", () => {
      renderHook(() => useStatus("no-session-job"), {
        wrapper: createWrapper(),
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe("fetching status", () => {
    it("fetches status when jobId and session are present", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: "processing",
            stage: "generating",
            progress: 45,
            resultId: null,
            errorMessage: null,
            updatedAt: "2024-12-21T10:30:00Z",
          }),
      })

      const { result } = renderHook(() => useStatus("test-job-id"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.status).toBe("processing")
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/status/test-job-id",
        expect.objectContaining({
          headers: {
            "X-Session-Token": "session-token-for-test-job-id",
          },
        })
      )
    })

    it("returns stage and progress from response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: "processing",
            stage: "generating",
            progress: 45,
            resultId: null,
            errorMessage: null,
            updatedAt: "2024-12-21T10:30:00Z",
          }),
      })

      const { result } = renderHook(() => useStatus("test-job-id"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.stage).toBe("generating")
        expect(result.current.progress).toBe(45)
      })
    })
  })

  describe("completion states", () => {
    it("sets isComplete when status is completed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: "completed",
            stage: "complete",
            progress: 100,
            resultId: "result-123",
            errorMessage: null,
            updatedAt: "2024-12-21T10:30:00Z",
          }),
      })

      const { result } = renderHook(() => useStatus("test-job-id"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true)
        expect(result.current.resultId).toBe("result-123")
      })
    })

    it("sets isFailed when status is failed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: "failed",
            stage: "failed",
            progress: 30,
            resultId: null,
            errorMessage: "AI processing failed",
            updatedAt: "2024-12-21T10:30:00Z",
          }),
      })

      const { result } = renderHook(() => useStatus("test-job-id"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isFailed).toBe(true)
        expect(result.current.errorMessage).toBe("AI processing failed")
      })
    })
  })

  describe("error handling", () => {
    it("handles fetch errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const { result } = renderHook(() => useStatus("test-job-id"), {
        wrapper: createWrapper(),
      })

      // Query should be in loading state initially
      expect(result.current.isLoading).toBe(true)

      // Wait for the error to propagate
      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.message).toBe("Network error")
      expect(result.current.status).toBeNull()
    })

    it("handles non-ok responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: "Internal server error" } }),
      })

      const { result } = renderHook(() => useStatus("test-job-id"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.message).toBe("Internal server error")
      expect(result.current.status).toBeNull()
    })

    it("handles non-ok responses without error message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.reject(new Error("Invalid JSON")),
      })

      const { result } = renderHook(() => useStatus("test-job-id"), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.message).toBe("Failed to fetch status: 404")
    })

    it("error state is initially null", () => {
      const { result } = renderHook(() => useStatus(null), {
        wrapper: createWrapper(),
      })
      expect(result.current.error).toBeNull()
    })
  })
})

describe("getStageLabel", () => {
  it("returns correct label for each stage", () => {
    expect(getStageLabel("validating")).toBe("Preparing your image...")
    expect(getStageLabel("generating")).toBe("Creating your portrait...")
    expect(getStageLabel("storing")).toBe("Saving your masterpiece...")
    expect(getStageLabel("watermarking")).toBe("Adding final touches...")
    expect(getStageLabel("complete")).toBe("Complete!")
    expect(getStageLabel("failed")).toBe("Something went wrong")
    expect(getStageLabel(null)).toBe("Processing...")
  })
})

describe("getStageEmoji", () => {
  it("returns correct emoji for each stage", () => {
    expect(getStageEmoji("validating")).toBe("🔍")
    expect(getStageEmoji("generating")).toBe("🎨")
    expect(getStageEmoji("storing")).toBe("💾")
    expect(getStageEmoji("watermarking")).toBe("✨")
    expect(getStageEmoji("complete")).toBe("🎉")
    expect(getStageEmoji("failed")).toBe("😢")
    expect(getStageEmoji(null)).toBe("⏳")
  })
})
