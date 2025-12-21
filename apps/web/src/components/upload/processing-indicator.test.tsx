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
})
