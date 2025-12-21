import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"

import { UploadError } from "./upload-error"

describe("UploadError", () => {
  const defaultProps = {
    message: "We couldn't upload your image. Please try again!",
    onRetry: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("should display the error message", () => {
      render(<UploadError {...defaultProps} />)

      expect(screen.getByText(defaultProps.message)).toBeInTheDocument()
    })

    it("should display the error icon container", () => {
      const { container } = render(<UploadError {...defaultProps} />)

      // Icon container with destructive styling should be present
      const iconContainer = container.querySelector(".bg-destructive\\/10")
      expect(iconContainer).toBeInTheDocument()
    })

    it("should display a friendly title", () => {
      render(<UploadError {...defaultProps} />)

      expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument()
    })

    it("should display encouragement message", () => {
      render(<UploadError {...defaultProps} />)

      expect(screen.getByText(/Don't worry/)).toBeInTheDocument()
    })
  })

  describe("Retry Button", () => {
    it("should display Try Again button by default", () => {
      render(<UploadError {...defaultProps} />)

      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
    })

    it("should call onRetry when button is clicked", () => {
      render(<UploadError {...defaultProps} />)

      const button = screen.getByRole("button", { name: /try again/i })
      fireEvent.click(button)

      expect(defaultProps.onRetry).toHaveBeenCalledTimes(1)
    })

    it("should be disabled when retrying", () => {
      render(<UploadError {...defaultProps} retrying />)

      const button = screen.getByRole("button")
      expect(button).toBeDisabled()
    })

    it("should show 'Retrying...' text when retrying", () => {
      render(<UploadError {...defaultProps} retrying />)

      expect(screen.getByText(/retrying/i)).toBeInTheDocument()
    })

    it("should hide retry button when retryable is false", () => {
      render(<UploadError {...defaultProps} retryable={false} />)

      expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument()
    })
  })

  describe("Different Error Messages", () => {
    it("should display network error message", () => {
      const networkMessage = "Oops! Looks like you're offline. Check your connection and try again!"
      render(<UploadError {...defaultProps} message={networkMessage} />)

      expect(screen.getByText(networkMessage)).toBeInTheDocument()
    })

    it("should display timeout error message", () => {
      const timeoutMessage = "The upload took a bit too long. Let's give it another shot!"
      render(<UploadError {...defaultProps} message={timeoutMessage} />)

      expect(screen.getByText(timeoutMessage)).toBeInTheDocument()
    })

    it("should display server error message", () => {
      const serverMessage = "Something went wrong on our end. Let's give it another try!"
      render(<UploadError {...defaultProps} message={serverMessage} />)

      expect(screen.getByText(serverMessage)).toBeInTheDocument()
    })

    it("should display rate limit error message", () => {
      const rateLimitMessage = "You've reached the upload limit. Please try again in 5 minutes."
      render(<UploadError {...defaultProps} message={rateLimitMessage} />)

      expect(screen.getByText(rateLimitMessage)).toBeInTheDocument()
    })
  })
})
