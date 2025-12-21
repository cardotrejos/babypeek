import { render, screen, waitFor, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ProcessingScreen } from "./ProcessingScreen"

// Mock matchMedia for reduced motion tests
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe("ProcessingScreen", () => {
  beforeEach(() => {
    mockMatchMedia(false) // Default: animations enabled
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Stage Indicator", () => {
    it("maps validating stage to Analyzing (step 1)", () => {
      render(
        <ProcessingScreen
          stage="validating"
          progress={10}
          isComplete={false}
          isFailed={false}
        />
      )

      // Check stage indicator exists with Analyzing highlighted
      expect(screen.getByText("Analyzing")).toBeInTheDocument()
      expect(screen.getByText("Creating")).toBeInTheDocument()
      expect(screen.getByText("Finishing")).toBeInTheDocument()
    })

    it("maps generating stage to Creating (step 2)", () => {
      render(
        <ProcessingScreen
          stage="generating"
          progress={40}
          isComplete={false}
          isFailed={false}
        />
      )

      expect(
        screen.getByText("Creating your baby's portrait...")
      ).toBeInTheDocument()
    })

    it("maps storing stage to Finishing (step 3)", () => {
      render(
        <ProcessingScreen
          stage="storing"
          progress={70}
          isComplete={false}
          isFailed={false}
        />
      )

      expect(screen.getByText("Adding final touches...")).toBeInTheDocument()
    })

    it("maps watermarking stage to Finishing (step 3)", () => {
      render(
        <ProcessingScreen
          stage="watermarking"
          progress={85}
          isComplete={false}
          isFailed={false}
        />
      )

      expect(screen.getByText("Adding final touches...")).toBeInTheDocument()
    })

    it("maps complete stage to Finishing (step 3)", () => {
      render(
        <ProcessingScreen
          stage="complete"
          progress={100}
          isComplete={true}
          isFailed={false}
        />
      )

      expect(screen.getByText("Adding final touches...")).toBeInTheDocument()
    })

    it("defaults to Analyzing when stage is null", () => {
      render(
        <ProcessingScreen
          stage={null}
          progress={0}
          isComplete={false}
          isFailed={false}
        />
      )

      expect(
        screen.getByText("Analyzing your ultrasound...")
      ).toBeInTheDocument()
    })
  })

  describe("Progress Bar", () => {
    it("renders progress bar with correct value", () => {
      render(
        <ProcessingScreen
          stage="generating"
          progress={45}
          isComplete={false}
          isFailed={false}
        />
      )

      const progressBar = screen.getByRole("progressbar")
      expect(progressBar).toHaveAttribute("aria-valuenow", "45")
    })

    it("includes aria-label with progress and stage info", () => {
      render(
        <ProcessingScreen
          stage="validating"
          progress={25}
          isComplete={false}
          isFailed={false}
        />
      )

      const progressBar = screen.getByRole("progressbar")
      expect(progressBar).toHaveAttribute(
        "aria-label",
        "Processing 25% complete, stage 1 of 3"
      )
    })

    it("displays progress percentage text", () => {
      render(
        <ProcessingScreen
          stage="generating"
          progress={60}
          isComplete={false}
          isFailed={false}
        />
      )

      expect(screen.getByText("60% complete")).toBeInTheDocument()
    })
  })

  describe("Accessibility (AC-6)", () => {
    it("has aria-live region for stage announcements", () => {
      const { container } = render(
        <ProcessingScreen
          stage="validating"
          progress={10}
          isComplete={false}
          isFailed={false}
        />
      )

      const liveRegion = container.querySelector('[aria-live="polite"]')
      expect(liveRegion).toBeInTheDocument()
    })

    it("announces stage changes to screen readers", () => {
      const { container, rerender } = render(
        <ProcessingScreen
          stage="validating"
          progress={10}
          isComplete={false}
          isFailed={false}
        />
      )

      // Check initial announcement
      const liveRegion = container.querySelector('[aria-live="polite"]')
      expect(liveRegion).toHaveTextContent(
        "Stage 1 of 3: Analyzing your ultrasound"
      )

      // Change stage
      rerender(
        <ProcessingScreen
          stage="generating"
          progress={40}
          isComplete={false}
          isFailed={false}
        />
      )

      expect(liveRegion).toHaveTextContent(
        "Stage 2 of 3: Creating your baby's portrait"
      )
    })

    it("includes skip link for accessibility", () => {
      render(
        <ProcessingScreen
          stage="validating"
          progress={10}
          isComplete={false}
          isFailed={false}
        />
      )

      const skipLink = screen.getByText("Skip to main content")
      expect(skipLink).toHaveAttribute("href", "#processing-content")
    })
  })

  describe("Baby Facts", () => {
    it("displays baby facts carousel", () => {
      render(
        <ProcessingScreen
          stage="generating"
          progress={50}
          isComplete={false}
          isFailed={false}
        />
      )

      expect(screen.getByText("💡 Did you know?")).toBeInTheDocument()
    })

    it("rotates facts every 10 seconds", async () => {
      render(
        <ProcessingScreen
          stage="generating"
          progress={50}
          isComplete={false}
          isFailed={false}
        />
      )

      // First fact
      expect(
        screen.getByText("Your baby can hear your voice from inside the womb!")
      ).toBeInTheDocument()

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(10000)
        await vi.advanceTimersByTimeAsync(400)
      })

      expect(
        screen.getByText("Babies start dreaming before they're born.")
      ).toBeInTheDocument()
    })
  })

  describe("Image Skeleton", () => {
    it("renders skeleton placeholder for image area", () => {
      render(
        <ProcessingScreen
          stage="generating"
          progress={50}
          isComplete={false}
          isFailed={false}
        />
      )

      expect(
        screen.getByText("Your portrait will appear here")
      ).toBeInTheDocument()
    })
  })

  describe("Reduced Motion", () => {
    it("respects prefers-reduced-motion setting", () => {
      mockMatchMedia(true) // Reduced motion enabled

      const { container } = render(
        <ProcessingScreen
          stage="generating"
          progress={50}
          isComplete={false}
          isFailed={false}
        />
      )

      // Background animations should not be present
      const backgroundAnimations = container.querySelectorAll(
        ".animate-pulse-slow, .animate-pulse-slower"
      )
      expect(backgroundAnimations).toHaveLength(0)
    })

    it("shows animations when reduced motion is not preferred", () => {
      mockMatchMedia(false) // Reduced motion disabled

      const { container } = render(
        <ProcessingScreen
          stage="generating"
          progress={50}
          isComplete={false}
          isFailed={false}
        />
      )

      // Background animations should be present
      const backgroundContainer = container.querySelector(".pointer-events-none")
      expect(backgroundContainer).toBeInTheDocument()
    })
  })

  describe("Stage Copy", () => {
    it("shows stage-specific main copy", () => {
      const { rerender } = render(
        <ProcessingScreen
          stage="validating"
          progress={10}
          isComplete={false}
          isFailed={false}
        />
      )

      expect(
        screen.getByText("Analyzing your ultrasound...")
      ).toBeInTheDocument()

      rerender(
        <ProcessingScreen
          stage="generating"
          progress={50}
          isComplete={false}
          isFailed={false}
        />
      )

      expect(
        screen.getByText("Creating your baby's portrait...")
      ).toBeInTheDocument()

      rerender(
        <ProcessingScreen
          stage="watermarking"
          progress={90}
          isComplete={false}
          isFailed={false}
        />
      )

      expect(screen.getByText("Adding final touches...")).toBeInTheDocument()
    })
  })
})
