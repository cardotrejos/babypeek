import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"

import { EmailInput } from "./email-input"

// Mock analytics
vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => ({
    trackEvent: vi.fn(),
  }),
}))

describe("EmailInput", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =============================================================================
  // Rendering Tests
  // =============================================================================

  it("renders email input with label", () => {
    render(<EmailInput {...defaultProps} />)

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("has type='email' attribute for mobile keyboards", () => {
    render(<EmailInput {...defaultProps} />)

    const input = screen.getByRole("textbox")
    expect(input).toHaveAttribute("type", "email")
  })

  it("has inputMode='email' for mobile optimization", () => {
    render(<EmailInput {...defaultProps} />)

    const input = screen.getByRole("textbox")
    expect(input).toHaveAttribute("inputMode", "email")
  })

  it("has autoComplete='email' attribute", () => {
    render(<EmailInput {...defaultProps} />)

    const input = screen.getByRole("textbox")
    expect(input).toHaveAttribute("autoComplete", "email")
  })

  it("renders with custom placeholder", () => {
    render(<EmailInput {...defaultProps} placeholder="test@example.com" />)

    const input = screen.getByRole("textbox")
    expect(input).toHaveAttribute("placeholder", "test@example.com")
  })

  // =============================================================================
  // Validation Tests
  // =============================================================================

  it("shows error for empty email on blur", async () => {
    const user = userEvent.setup()
    render(<EmailInput {...defaultProps} value="" />)

    const input = screen.getByRole("textbox")
    await user.click(input)
    await user.tab() // blur

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /we'll need your email/i
      )
    })
  })

  it("shows error for invalid email format on blur", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<EmailInput value="invalid" onChange={onChange} />)

    const input = screen.getByRole("textbox")
    await user.click(input)
    await user.tab() // blur

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /doesn't look quite right/i
      )
    })
  })

  it("does not show error for valid email on blur", async () => {
    const user = userEvent.setup()
    render(<EmailInput {...defaultProps} value="test@example.com" />)

    const input = screen.getByRole("textbox")
    await user.click(input)
    await user.tab() // blur

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
  })

  it("validates emails with special characters", async () => {
    const user = userEvent.setup()
    render(<EmailInput {...defaultProps} value="test+filter@example.com" />)

    const input = screen.getByRole("textbox")
    await user.click(input)
    await user.tab()

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
  })

  it("rejects email without @ symbol", async () => {
    const user = userEvent.setup()
    render(<EmailInput {...defaultProps} value="testexample.com" />)

    const input = screen.getByRole("textbox")
    await user.click(input)
    await user.tab()

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
    })
  })

  it("rejects email without domain", async () => {
    const user = userEvent.setup()
    render(<EmailInput {...defaultProps} value="test@" />)

    const input = screen.getByRole("textbox")
    await user.click(input)
    await user.tab()

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument()
    })
  })

  // =============================================================================
  // Callback Tests
  // =============================================================================

  it("calls onChange when typing", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<EmailInput value="" onChange={onChange} />)

    const input = screen.getByRole("textbox")
    await user.type(input, "t")

    expect(onChange).toHaveBeenCalled()
  })

  it("calls onValidityChange with true for valid email", async () => {
    const user = userEvent.setup()
    const onValidityChange = vi.fn()
    render(
      <EmailInput
        {...defaultProps}
        value="test@example.com"
        onValidityChange={onValidityChange}
      />
    )

    const input = screen.getByRole("textbox")
    await user.click(input)
    await user.tab()

    await waitFor(() => {
      expect(onValidityChange).toHaveBeenCalledWith(true)
    })
  })

  it("calls onValidityChange with false for invalid email", async () => {
    const user = userEvent.setup()
    const onValidityChange = vi.fn()
    render(
      <EmailInput
        {...defaultProps}
        value="invalid"
        onValidityChange={onValidityChange}
      />
    )

    const input = screen.getByRole("textbox")
    await user.click(input)
    await user.tab()

    await waitFor(() => {
      expect(onValidityChange).toHaveBeenCalledWith(false)
    })
  })

  // =============================================================================
  // Accessibility Tests
  // =============================================================================

  it("has aria-invalid=true when error is shown", async () => {
    const user = userEvent.setup()
    render(<EmailInput {...defaultProps} value="invalid" />)

    const input = screen.getByRole("textbox")
    await user.click(input)
    await user.tab()

    await waitFor(() => {
      expect(input).toHaveAttribute("aria-invalid", "true")
    })
  })

  it("has aria-describedby linking to error message", async () => {
    const user = userEvent.setup()
    render(<EmailInput {...defaultProps} value="invalid" />)

    const input = screen.getByRole("textbox")
    await user.click(input)
    await user.tab()

    await waitFor(() => {
      const ariaDescribedBy = input.getAttribute("aria-describedby")
      expect(ariaDescribedBy).toBeTruthy()
      const errorElement = document.getElementById(ariaDescribedBy!)
      expect(errorElement).toBeInTheDocument()
    })
  })

  it("does not have aria-describedby when no error", () => {
    render(<EmailInput {...defaultProps} value="test@example.com" />)

    const input = screen.getByRole("textbox")
    expect(input).not.toHaveAttribute("aria-describedby")
  })

  // =============================================================================
  // External Error Tests
  // =============================================================================

  it("displays external error over internal validation", () => {
    render(
      <EmailInput
        {...defaultProps}
        value="test@example.com"
        error="Server error"
      />
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Server error")
  })

  // =============================================================================
  // Disabled State Tests
  // =============================================================================

  it("disables input when disabled prop is true", () => {
    render(<EmailInput {...defaultProps} disabled />)

    const input = screen.getByRole("textbox")
    expect(input).toBeDisabled()
  })
})
