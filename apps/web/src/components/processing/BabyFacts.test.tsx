import { render, screen, waitFor, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { BabyFacts } from "./BabyFacts"

describe("BabyFacts", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders 'Did you know?' header", () => {
    render(<BabyFacts />)

    expect(screen.getByText("💡 Did you know?")).toBeInTheDocument()
  })

  it("displays first baby fact initially", () => {
    render(<BabyFacts />)

    expect(
      screen.getByText("Your baby can hear your voice from inside the womb!")
    ).toBeInTheDocument()
  })

  it("rotates to next fact after 10 seconds", async () => {
    render(<BabyFacts />)

    // Initially shows first fact
    expect(
      screen.getByText("Your baby can hear your voice from inside the womb!")
    ).toBeInTheDocument()

    // Advance time to trigger rotation
    await act(async () => {
      vi.advanceTimersByTime(10000) // 10s
      await vi.advanceTimersByTimeAsync(400) // Fade transition
    })

    expect(
      screen.getByText("Babies start dreaming before they're born.")
    ).toBeInTheDocument()
  })

  it("cycles through facts continuously", async () => {
    render(<BabyFacts />)

    // Rotate once
    await act(async () => {
      vi.advanceTimersByTime(10000)
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(
      screen.getByText("Babies start dreaming before they're born.")
    ).toBeInTheDocument()

    // Rotate again
    await act(async () => {
      vi.advanceTimersByTime(10000)
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(
      screen.getByText("A baby's fingerprints form at 10 weeks.")
    ).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<BabyFacts className="test-class" />)

    expect(container.firstChild).toHaveClass("test-class")
  })

  it("has warm styling", () => {
    const { container } = render(<BabyFacts />)

    expect(container.firstChild).toHaveClass("bg-rose/30")
    expect(container.firstChild).toHaveClass("rounded-xl")
  })

  it("cleans up interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval")

    const { unmount } = render(<BabyFacts />)
    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })

  describe("Reduced Motion Support (Story 5.4)", () => {
    it("should not rotate facts when static=true", async () => {
      render(<BabyFacts static={true} />)

      // Initially shows first fact
      expect(
        screen.getByText("Your baby can hear your voice from inside the womb!")
      ).toBeInTheDocument()

      // Advance time past rotation interval
      await act(async () => {
        vi.advanceTimersByTime(10000)
        await vi.advanceTimersByTimeAsync(400)
      })

      // Should still show first fact (not rotated)
      expect(
        screen.getByText("Your baby can hear your voice from inside the womb!")
      ).toBeInTheDocument()
    })

    it("should not apply transition animation when static=true", () => {
      const { container } = render(<BabyFacts static={true} />)

      const factText = container.querySelector("p:last-child")
      expect(factText).not.toHaveClass("transition-opacity")
    })

    it("should apply transition animation when static=false", () => {
      const { container } = render(<BabyFacts static={false} />)

      const factText = container.querySelector("p:last-child")
      expect(factText).toHaveClass("transition-opacity")
    })
  })
})
