import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

import { ProcessingIndicator } from "./processing-indicator"

describe("ProcessingIndicator", () => {
  it("renders with default message", () => {
    render(<ProcessingIndicator />)
    
    expect(screen.getByText("Preparing image...")).toBeInTheDocument()
  })

  it("renders with custom message", () => {
    render(<ProcessingIndicator message="Converting..." />)
    
    expect(screen.getByText("Converting...")).toBeInTheDocument()
  })

  it("has correct accessibility attributes", () => {
    render(<ProcessingIndicator />)
    
    const indicator = screen.getByRole("status")
    expect(indicator).toHaveAttribute("aria-live", "polite")
    expect(indicator).toHaveAttribute("aria-busy", "true")
  })

  it("includes screen reader description", () => {
    render(<ProcessingIndicator />)
    
    expect(
      screen.getByText("Please wait while we prepare your image for upload.")
    ).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<ProcessingIndicator className="custom-class" />)
    
    expect(container.firstChild).toHaveClass("custom-class")
  })

  it("renders spinner icon", () => {
    const { container } = render(<ProcessingIndicator />)
    
    // Check for the Loader2 icon with animate-spin class
    const spinner = container.querySelector(".animate-spin")
    expect(spinner).toBeInTheDocument()
  })

  describe("Progress Display", () => {
    it("shows progress percentage when provided", () => {
      render(<ProcessingIndicator message="Compressing image..." progress={45} />)
      
      expect(screen.getByText("Compressing image... 45%")).toBeInTheDocument()
    })

    it("shows progress bar when progress is provided", () => {
      render(<ProcessingIndicator message="Compressing..." progress={50} />)
      
      const progressBar = screen.getByRole("progressbar")
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute("aria-valuenow", "50")
      expect(progressBar).toHaveAttribute("aria-valuemin", "0")
      expect(progressBar).toHaveAttribute("aria-valuemax", "100")
    })

    it("does not show progress bar when progress is null", () => {
      render(<ProcessingIndicator message="Preparing..." progress={null} />)
      
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
    })

    it("does not show progress bar when progress is undefined", () => {
      render(<ProcessingIndicator message="Preparing..." />)
      
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument()
    })

    it("clamps progress bar width to 0-100", () => {
      const { rerender } = render(<ProcessingIndicator progress={-10} />)
      
      let progressBar = screen.getByRole("progressbar")
      expect(progressBar).toHaveStyle({ width: "0%" })
      
      rerender(<ProcessingIndicator progress={150} />)
      progressBar = screen.getByRole("progressbar")
      expect(progressBar).toHaveStyle({ width: "100%" })
    })

    it("includes progress in screen reader announcement", () => {
      render(<ProcessingIndicator progress={75} />)
      
      expect(screen.getByText(/Progress: 75%/)).toBeInTheDocument()
    })
  })
})
