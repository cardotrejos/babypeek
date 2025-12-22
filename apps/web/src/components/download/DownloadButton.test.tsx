import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { DownloadButton } from "./DownloadButton"

// Mock PostHog
vi.mock("@/lib/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
  isPostHogConfigured: vi.fn(() => true),
}))

// Mock API config
vi.mock("@/lib/api-config", () => ({
  API_BASE_URL: "http://localhost:3000",
}))

// Import mocks
import { posthog } from "@/lib/posthog"

describe("DownloadButton", () => {
  const defaultProps = {
    uploadId: "test-upload-123",
    sessionToken: "test-token-abc",
    resultId: "test-result-456",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders with idle state", () => {
    render(<DownloadButton {...defaultProps} />)

    expect(screen.getByRole("button")).toHaveTextContent("Download HD Portrait")
    expect(screen.getByRole("button")).not.toBeDisabled()
  })

  it("shows loading state while fetching URL (AC-6)", async () => {
    // Mock slow API response
    global.fetch = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    )

    render(<DownloadButton {...defaultProps} />)

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Preparing download...")
      expect(screen.getByRole("button")).toBeDisabled()
    })
  })

  it("triggers download with correct API call (AC-1, AC-3)", async () => {
    const mockResponse = {
      success: true,
      downloadUrl: "https://r2.example.com/signed-url",
      suggestedFilename: "babypeek-baby-2024-01-15.jpg",
      expiresAt: "2024-01-22T12:00:00Z",
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    // Mock HTMLAnchorElement click
    HTMLAnchorElement.prototype.click = vi.fn()

    render(<DownloadButton {...defaultProps} />)

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      // Verify API was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/download/${defaultProps.uploadId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Session-Token": defaultProps.sessionToken,
          }),
        })
      )
    })
  })

  it("calls onSuccess callback after download completes (AC-4)", async () => {
    const onSuccess = vi.fn()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        downloadUrl: "https://r2.example.com/signed-url",
        suggestedFilename: "babypeek-baby-2024-01-15.jpg",
      }),
    })

    // Mock HTMLAnchorElement click to not actually navigate
    HTMLAnchorElement.prototype.click = vi.fn()

    render(<DownloadButton {...defaultProps} onSuccess={onSuccess} />)

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it("tracks download_clicked event on button click (AC-5)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        downloadUrl: "https://r2.example.com/signed-url",
        suggestedFilename: "test.jpg",
      }),
    })

    HTMLAnchorElement.prototype.click = vi.fn()

    render(<DownloadButton {...defaultProps} />)

    fireEvent.click(screen.getByRole("button"))

    // download_clicked is called immediately on click (AC-5: includes upload_id, result_id, source)
    expect(posthog.capture).toHaveBeenCalledWith("download_clicked", {
      upload_id: defaultProps.uploadId,
      result_id: defaultProps.resultId,
      source: "in_app",
    })
  })

  it("tracks download_completed after successful download", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        downloadUrl: "https://r2.example.com/signed-url",
        suggestedFilename: "test.jpg",
      }),
    })

    HTMLAnchorElement.prototype.click = vi.fn()

    render(<DownloadButton {...defaultProps} />)

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith("download_completed", {
        upload_id: defaultProps.uploadId,
        result_id: defaultProps.resultId,
        source: "in_app",
      })
    })
  })

  it("tracks download_failed on errors", async () => {
    const errorMessage = "Purchase required to download"

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        error: { message: errorMessage },
      }),
    })

    render(<DownloadButton {...defaultProps} />)

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(posthog.capture).toHaveBeenCalledWith("download_failed", {
        upload_id: defaultProps.uploadId,
        result_id: defaultProps.resultId,
        error: errorMessage,
      })
    })
  })

  it("calls onError callback on fetch failure", async () => {
    const onError = vi.fn()
    const errorMessage = "Session expired"

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        error: { message: errorMessage },
      }),
    })

    render(<DownloadButton {...defaultProps} onError={onError} />)

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(errorMessage)
    })
  })

  it("shows success state after download", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        downloadUrl: "https://r2.example.com/signed-url",
        suggestedFilename: "test.jpg",
      }),
    })

    HTMLAnchorElement.prototype.click = vi.fn()

    render(<DownloadButton {...defaultProps} />)

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Downloaded!")
    })
  })

  it("sends X-Session-Token header in API request", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        downloadUrl: "https://r2.example.com/signed-url",
        suggestedFilename: "test.jpg",
      }),
    })

    HTMLAnchorElement.prototype.click = vi.fn()

    render(<DownloadButton {...defaultProps} />)

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/download/${defaultProps.uploadId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Session-Token": defaultProps.sessionToken,
          }),
        })
      )
    })
  })

  it("handles network errors gracefully", async () => {
    const onError = vi.fn()

    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

    render(<DownloadButton {...defaultProps} onError={onError} />)

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Network error")
    })
  })

  it("keeps error state until user clicks again (no auto-reset)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        error: { message: "Download failed" },
      }),
    })

    render(<DownloadButton {...defaultProps} />)

    fireEvent.click(screen.getByRole("button"))

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Try Again")
    })

    // Wait to verify it doesn't auto-reset
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.getByRole("button")).toHaveTextContent("Try Again")
  })

  it("is disabled during fetching and downloading states", async () => {
    let resolvePromise: (value: unknown) => void
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    global.fetch = vi.fn().mockReturnValue(slowPromise)

    render(<DownloadButton {...defaultProps} />)
    const button = screen.getByRole("button")

    expect(button).not.toBeDisabled()

    fireEvent.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        downloadUrl: "https://example.com",
        suggestedFilename: "test.jpg",
      }),
    })

    HTMLAnchorElement.prototype.click = vi.fn()

    await waitFor(() => {
      // After success, button should show success state but not be disabled
      expect(screen.getByRole("button")).toHaveTextContent("Downloaded!")
    })
  })
})
