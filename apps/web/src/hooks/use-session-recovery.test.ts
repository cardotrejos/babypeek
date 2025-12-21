import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"

// Mock TanStack Router
const mockNavigate = vi.fn()
const mockLocation = { pathname: "/" }

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}))

// Mock posthog
vi.mock("@/lib/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
  isPostHogConfigured: () => false,
}))

// Import after mocks
import { useSessionRecovery } from "./use-session-recovery"
import {
  storeSession,
  updateJobStatus,
  updateJobResult,
  JOB_DATA_PREFIX,
} from "@/lib/session"

describe("useSessionRecovery", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockLocation.pathname = "/"
    mockNavigate.mockClear()

    // Default: server says still processing
    globalThis.fetch = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ status: "processing", resultId: null, errorMessage: null }),
      } as Response
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch
  })

  it("should not show recovery prompt when no pending job", async () => {
    const { result } = renderHook(() => useSessionRecovery())

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.showRecoveryPrompt).toBe(false)
    expect(result.current.pendingJob).toBeNull()
  })

  it("should show recovery prompt for pending job", async () => {
    storeSession("job-123", "token-abc")

    const { result } = renderHook(() => useSessionRecovery())

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.showRecoveryPrompt).toBe(true)
    expect(result.current.pendingJob).not.toBeNull()
    expect(result.current.pendingJob?.jobId).toBe("job-123")
  })

  it("should show recovery prompt for processing job", async () => {
    storeSession("job-123", "token-abc")
    updateJobStatus("job-123", "processing")

    const { result } = renderHook(() => useSessionRecovery())

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.showRecoveryPrompt).toBe(true)
    expect(result.current.pendingJob?.status).toBe("processing")
  })

  it("should redirect to result page for completed job", async () => {
    storeSession("job-123", "token-abc")
    updateJobResult("job-123", "result-456")

    renderHook(() => useSessionRecovery())

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/result/$resultId",
        params: { resultId: "result-456" },
      })
    })
  })

  it("should not check recovery on processing page", async () => {
    storeSession("job-123", "token-abc")
    mockLocation.pathname = "/processing/job-123"

    const { result } = renderHook(() => useSessionRecovery())

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.showRecoveryPrompt).toBe(false)
  })

  it("should not check recovery on result page", async () => {
    storeSession("job-123", "token-abc")
    mockLocation.pathname = "/result/result-456"

    const { result } = renderHook(() => useSessionRecovery())

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.showRecoveryPrompt).toBe(false)
  })

  it("resumeJob should navigate to processing page", async () => {
    storeSession("job-123", "token-abc")

    const { result } = renderHook(() => useSessionRecovery())

    await waitFor(() => {
      expect(result.current.showRecoveryPrompt).toBe(true)
    })

    act(() => {
      result.current.resumeJob()
    })

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/processing/$jobId",
      params: { jobId: "job-123" },
    })
    expect(result.current.showRecoveryPrompt).toBe(false)
  })

  it("startFresh should clear session and hide prompt", async () => {
    storeSession("job-123", "token-abc")

    const { result } = renderHook(() => useSessionRecovery())

    await waitFor(() => {
      expect(result.current.showRecoveryPrompt).toBe(true)
    })

    act(() => {
      result.current.startFresh()
    })

    expect(result.current.showRecoveryPrompt).toBe(false)
    expect(localStorage.getItem(`${JOB_DATA_PREFIX}job-123`)).toBeNull()
  })

  it("dismissPrompt should hide prompt without clearing session", async () => {
    storeSession("job-123", "token-abc")

    const { result } = renderHook(() => useSessionRecovery())

    await waitFor(() => {
      expect(result.current.showRecoveryPrompt).toBe(true)
    })

    act(() => {
      result.current.dismissPrompt()
    })

    expect(result.current.showRecoveryPrompt).toBe(false)
    // Session should still exist
    expect(localStorage.getItem(`${JOB_DATA_PREFIX}job-123`)).not.toBeNull()
  })

  it("does not re-show prompt after dismiss on route change", async () => {
    storeSession("job-123", "token-abc")

    const { result, rerender } = renderHook(() => useSessionRecovery())

    await waitFor(() => {
      expect(result.current.showRecoveryPrompt).toBe(true)
    })

    act(() => {
      result.current.dismissPrompt()
    })

    expect(result.current.showRecoveryPrompt).toBe(false)

    // Simulate route change
    mockLocation.pathname = "/about"
    rerender()

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })

    expect(result.current.showRecoveryPrompt).toBe(false)
  })

  it("re-checks on visibility change and redirects if status completes", async () => {
    // First check: still processing; second check: completed
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "processing", resultId: null, errorMessage: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "completed", resultId: "result-999", errorMessage: null }),
      })

    // Mock document.visibilityState
    const originalVisibilityState = Object.getOwnPropertyDescriptor(document, "visibilityState")
    let visibilityState: DocumentVisibilityState = "visible"
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    })

    storeSession("job-123", "token-abc")

    const { result } = renderHook(() => useSessionRecovery())

    await waitFor(() => {
      expect(result.current.showRecoveryPrompt).toBe(true)
    })

    // Simulate app returning to foreground
    act(() => {
      visibilityState = "visible"
      document.dispatchEvent(new Event("visibilitychange"))
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/result/$resultId",
        params: { resultId: "result-999" },
      })
    })

    // Restore descriptor
    if (originalVisibilityState) {
      Object.defineProperty(document, "visibilityState", originalVisibilityState)
    }
  })
})
