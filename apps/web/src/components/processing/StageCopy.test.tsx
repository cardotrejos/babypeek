import { render, screen, waitFor, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { StageCopy } from "./StageCopy"

describe("StageCopy", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders main copy for analyzing stage", () => {
    render(<StageCopy uiStage="analyzing" />)

    expect(screen.getByText("Analyzing your ultrasound...")).toBeInTheDocument()
  })

  it("renders main copy for creating stage", () => {
    render(<StageCopy uiStage="creating" />)

    expect(
      screen.getByText("Creating your baby's portrait...")
    ).toBeInTheDocument()
  })

  it("renders main copy for finishing stage", () => {
    render(<StageCopy uiStage="finishing" />)

    expect(screen.getByText("Adding final touches...")).toBeInTheDocument()
  })

  it("shows first sub-copy initially", () => {
    render(<StageCopy uiStage="analyzing" />)

    expect(
      screen.getByText("Finding your baby's unique features")
    ).toBeInTheDocument()
  })

  it("rotates sub-copy after 4 seconds", async () => {
    render(<StageCopy uiStage="analyzing" />)

    // Initially shows first sub-copy
    expect(
      screen.getByText("Finding your baby's unique features")
    ).toBeInTheDocument()

    // Advance time to trigger rotation - need to run all pending timers
    await act(async () => {
      vi.advanceTimersByTime(4000) // 4s
      await vi.advanceTimersByTimeAsync(300) // Fade transition
    })

    expect(screen.getByText("Scanning for details")).toBeInTheDocument()
  })

  it("resets sub-copy when stage changes", () => {
    const { rerender } = render(<StageCopy uiStage="analyzing" />)

    // Advance time to rotate
    act(() => {
      vi.advanceTimersByTime(4200)
    })

    // Should be on second sub-copy
    expect(screen.getByText("Scanning for details")).toBeInTheDocument()

    // Change stage
    rerender(<StageCopy uiStage="creating" />)

    // Should reset to first sub-copy of creating stage
    expect(
      screen.getByText("Our AI is working its magic")
    ).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <StageCopy uiStage="analyzing" className="test-class" />
    )

    expect(container.firstChild).toHaveClass("test-class")
  })

  it("uses correct typography classes", () => {
    render(<StageCopy uiStage="analyzing" />)

    const mainCopy = screen.getByRole("heading", { level: 1 })
    expect(mainCopy).toHaveClass("font-display")
    expect(mainCopy).toHaveClass("text-charcoal")
  })
})
