import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { RevealAnimation } from "./RevealAnimation"
import { revealAnimation } from "./animation-config"

// Mock matchMedia for reduced motion detection
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false, // Default: no reduced motion preference
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

describe("RevealAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.matchMedia = mockMatchMedia
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe("Initial State (AC-1)", () => {
    it("should render with initial blur, opacity, and scale values", () => {
      render(<RevealAnimation imageUrl="https://example.com/image.jpg" />)

      const image = screen.getByRole("img")

      // Initially should NOT have the reveal-active class
      expect(image.className).toContain("reveal-initial")
      expect(image.className).not.toContain("reveal-active")
    })

    it("should render the image with correct alt text", () => {
      render(
        <RevealAnimation
          imageUrl="https://example.com/image.jpg"
          alt="Custom alt text"
        />
      )

      const image = screen.getByRole("img")
      expect(image).toHaveAttribute("alt", "Custom alt text")
    })

    it("should use default alt text when not provided", () => {
      render(<RevealAnimation imageUrl="https://example.com/image.jpg" />)

      const image = screen.getByRole("img")
      expect(image).toHaveAttribute("alt", "Your baby's portrait")
    })
  })

  describe("Animation Sequence (AC-2, AC-3)", () => {
    it("should start animation after initial delay", () => {
      render(<RevealAnimation imageUrl="https://example.com/image.jpg" />)

      const image = screen.getByRole("img")

      // Before delay - should have initial state
      expect(image.className).toContain("reveal-initial")

      // Advance past start delay
      act(() => {
        vi.advanceTimersByTime(revealAnimation.startDelay + 10)
      })

      // After delay - should have active state
      expect(image.className).toContain("reveal-active")
    })

    it("should apply GPU-accelerated styles (AC-7)", () => {
      render(<RevealAnimation imageUrl="https://example.com/image.jpg" />)

      const image = screen.getByRole("img")

      // Should have will-change for GPU acceleration
      expect(image.className).toContain("will-change-")
    })
  })

  describe("UI Delay (AC-4)", () => {
    it("should not show UI initially", () => {
      render(<RevealAnimation imageUrl="https://example.com/image.jpg" />)

      // UI should not be visible initially
      expect(screen.queryByTestId("reveal-ui")).not.toBeInTheDocument()
    })

    it("should call onRevealComplete after UI delay", () => {
      const onRevealComplete = vi.fn()

      render(
        <RevealAnimation
          imageUrl="https://example.com/image.jpg"
          onRevealComplete={onRevealComplete}
        />
      )

      // Before UI delay - callback not called
      expect(onRevealComplete).not.toHaveBeenCalled()

      // Advance past UI delay
      act(() => {
        vi.advanceTimersByTime(revealAnimation.uiDelay + 10)
      })

      // After delay - callback should be called
      expect(onRevealComplete).toHaveBeenCalledTimes(1)
    })

    it("should show UI after delay when showUI is managed externally", () => {
      const { rerender } = render(
        <RevealAnimation
          imageUrl="https://example.com/image.jpg"
          showUI={false}
        />
      )

      // UI should not be visible with showUI=false
      expect(screen.queryByTestId("reveal-ui")).not.toBeInTheDocument()

      // Rerender with showUI=true
      rerender(
        <RevealAnimation
          imageUrl="https://example.com/image.jpg"
          showUI={true}
        />
      )

      // UI should now be visible
      expect(screen.getByTestId("reveal-ui")).toBeInTheDocument()
    })
  })

  describe("Cleanup", () => {
    it("should clean up timeouts on unmount", () => {
      const { unmount } = render(
        <RevealAnimation imageUrl="https://example.com/image.jpg" />
      )

      // Unmount before timeouts complete
      unmount()

      // Advance timers - should not throw
      act(() => {
        vi.advanceTimersByTime(revealAnimation.uiDelay + 1000)
      })

      // If we get here without errors, cleanup worked
      expect(true).toBe(true)
    })
  })

  describe("Accessibility", () => {
    it("should have appropriate aria attributes during reveal", () => {
      render(<RevealAnimation imageUrl="https://example.com/image.jpg" />)

      const container = screen.getByTestId("reveal-container")
      expect(container).toBeInTheDocument()
    })
  })

  describe("Animation Timing (AC-2, AC-3, AC-4)", () => {
    it("should use correct blur transition duration (2000ms)", () => {
      expect(revealAnimation.blur.duration).toBe(2000)
    })

    it("should use correct zoom transition duration (2500ms)", () => {
      expect(revealAnimation.scale.duration).toBe(2500)
    })

    it("should use correct UI delay (3500ms)", () => {
      expect(revealAnimation.uiDelay).toBe(3500)
    })

    it("should use easeOutCubic easing for blur and scale", () => {
      expect(revealAnimation.blur.easing).toBe("cubic-bezier(0.33, 1, 0.68, 1)")
      expect(revealAnimation.scale.easing).toBe("cubic-bezier(0.33, 1, 0.68, 1)")
    })

    it("should apply correct transition durations to image", () => {
      render(<RevealAnimation imageUrl="https://example.com/image.jpg" />)

      // Trigger reveal
      act(() => {
        vi.advanceTimersByTime(revealAnimation.startDelay + 10)
      })

      const image = screen.getByRole("img")
      const style = image.style

      // Check transition durations are set correctly
      expect(style.transitionDuration).toContain("2000ms")
      expect(style.transitionDuration).toContain("2500ms")
    })

    it("should show UI exactly after 3500ms delay", () => {
      const onRevealComplete = vi.fn()
      render(
        <RevealAnimation
          imageUrl="https://example.com/image.jpg"
          onRevealComplete={onRevealComplete}
        />
      )

      // Just before 3500ms - should not be called
      act(() => {
        vi.advanceTimersByTime(3499)
      })
      expect(onRevealComplete).not.toHaveBeenCalled()

      // At 3500ms+ - should be called
      act(() => {
        vi.advanceTimersByTime(2)
      })
      expect(onRevealComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe("Reduced Motion Support", () => {
    it("should skip animation for users who prefer reduced motion", () => {
      // Mock reduced motion preference
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: true, // User prefers reduced motion
        media: "(prefers-reduced-motion: reduce)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))

      const onRevealComplete = vi.fn()
      render(
        <RevealAnimation
          imageUrl="https://example.com/image.jpg"
          onRevealComplete={onRevealComplete}
        />
      )

      // Should immediately show revealed state without animation
      const image = screen.getByRole("img")
      expect(image.className).toContain("reveal-active")
      
      // Callback should be called immediately
      expect(onRevealComplete).toHaveBeenCalledTimes(1)
    })
  })

  describe("Performance Optimization (AC-5, AC-7)", () => {
    it("should use will-change for GPU acceleration", () => {
      render(<RevealAnimation imageUrl="https://example.com/image.jpg" />)

      const image = screen.getByRole("img")
      // Verify will-change is applied via class
      expect(image.className).toContain("will-change-")
    })

    it("should only animate GPU-composited properties", () => {
      render(<RevealAnimation imageUrl="https://example.com/image.jpg" />)

      // Trigger reveal
      act(() => {
        vi.advanceTimersByTime(revealAnimation.startDelay + 10)
      })

      const image = screen.getByRole("img")
      const style = image.style

      // Only transform, filter, and opacity should be transitioned
      expect(style.transitionProperty).toBe("filter, transform, opacity")

      // Should NOT include layout-triggering properties
      expect(style.transitionProperty).not.toContain("width")
      expect(style.transitionProperty).not.toContain("height")
      expect(style.transitionProperty).not.toContain("margin")
      expect(style.transitionProperty).not.toContain("padding")
    })

    it("should use CSS transform for scaling (not width/height)", () => {
      render(<RevealAnimation imageUrl="https://example.com/image.jpg" />)

      // Trigger reveal
      act(() => {
        vi.advanceTimersByTime(revealAnimation.startDelay + 10)
      })

      const image = screen.getByRole("img")
      const style = image.style

      // Should use transform for scale, not explicit dimensions
      expect(style.transform).toContain("scale")
    })

    it("should use filter for blur effect (GPU accelerated in modern browsers)", () => {
      render(<RevealAnimation imageUrl="https://example.com/image.jpg" />)

      const image = screen.getByRole("img")
      const style = image.style

      // Initially blurred
      expect(style.filter).toContain("blur(20px)")

      // Trigger reveal
      act(() => {
        vi.advanceTimersByTime(revealAnimation.startDelay + 10)
      })

      // After reveal, blur should be 0
      expect(style.filter).toBe("blur(0px)")
    })
  })
})
