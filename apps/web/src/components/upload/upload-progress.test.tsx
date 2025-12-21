import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

import { UploadProgress } from "./upload-progress"

describe("UploadProgress", () => {
  // =============================================================================
  // Rendering Tests
  // =============================================================================

  it("renders progress bar with correct percentage", () => {
    render(<UploadProgress progress={50} />)

    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "50")
    expect(progressBar).toHaveAttribute("aria-valuemin", "0")
    expect(progressBar).toHaveAttribute("aria-valuemax", "100")
  })

  it("displays progress percentage in status message", () => {
    render(<UploadProgress progress={75} />)

    expect(screen.getByText(/75%/)).toBeInTheDocument()
  })

  it("displays custom status message when provided", () => {
    render(<UploadProgress progress={50} statusMessage="Preparing upload..." />)

    expect(screen.getByText("Preparing upload...")).toBeInTheDocument()
    expect(screen.queryByText(/50%/)).not.toBeInTheDocument()
  })

  it("shows completion message at 100%", () => {
    render(<UploadProgress progress={100} />)

    expect(screen.getByText(/complete/i)).toBeInTheDocument()
  })

  // =============================================================================
  // Progress Bar Visual Tests
  // =============================================================================

  it("clamps progress to valid range", () => {
    const { rerender } = render(<UploadProgress progress={-10} />)

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")

    rerender(<UploadProgress progress={150} />)

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100")
  })

  // =============================================================================
  // Cancel Button Tests
  // =============================================================================

  it("shows cancel button when showCancel is true and not complete", () => {
    const onCancel = vi.fn()
    render(<UploadProgress progress={50} showCancel onCancel={onCancel} />)

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
  })

  it("hides cancel button when progress is 100%", () => {
    const onCancel = vi.fn()
    render(<UploadProgress progress={100} showCancel onCancel={onCancel} />)

    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument()
  })

  it("hides cancel button when showCancel is false", () => {
    const onCancel = vi.fn()
    render(<UploadProgress progress={50} showCancel={false} onCancel={onCancel} />)

    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument()
  })

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<UploadProgress progress={50} showCancel onCancel={onCancel} />)

    await user.click(screen.getByRole("button", { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // =============================================================================
  // Accessibility Tests
  // =============================================================================

  it("has accessible label", () => {
    render(<UploadProgress progress={50} />)

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "Upload progress"
    )
  })

  it("announces progress to screen readers", () => {
    render(<UploadProgress progress={50} />)

    expect(screen.getByText(/upload progress: 50 percent/i)).toBeInTheDocument()
  })
})
