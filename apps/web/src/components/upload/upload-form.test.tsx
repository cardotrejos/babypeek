import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { UploadForm } from "./upload-form";

// Mock analytics
vi.mock("@/hooks/use-analytics", () => ({
  useAnalytics: () => ({
    trackEvent: vi.fn(),
  }),
}));

// Mock image processor
vi.mock("@/hooks/use-image-processor", () => ({
  useImageProcessor: () => ({
    processImage: vi.fn().mockResolvedValue({
      file: new File(["test"], "test.jpg", { type: "image/jpeg" }),
      wasConverted: false,
      wasCompressed: false,
      originalSize: 1000,
      finalSize: 1000,
    }),
    compressImage: vi.fn(),
    isProcessing: false,
    processingProgress: null,
    progressPercent: null,
  }),
}));

// Helper to create mock files
function createMockFile(name: string, type: string, size: number = 1000): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("UploadForm", () => {
  const defaultProps = {
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================================================
  // Rendering Tests
  // =============================================================================

  it("renders email input and image uploader", () => {
    render(<UploadForm {...defaultProps} />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<UploadForm {...defaultProps} />);

    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });

  it("shows helper text when form is incomplete", () => {
    render(<UploadForm {...defaultProps} />);

    expect(screen.getByText(/enter your email and upload your ultrasound/i)).toBeInTheDocument();
  });

  // =============================================================================
  // Validation Tests
  // =============================================================================

  it("disables submit button when email is empty", async () => {
    render(<UploadForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /start/i });
    expect(submitButton).toBeDisabled();
  });

  it("disables submit button when no file selected", async () => {
    const user = userEvent.setup();
    render(<UploadForm {...defaultProps} />);

    // Enter valid email
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");
    await user.tab();

    const submitButton = screen.getByRole("button", { name: /start/i });
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when both email and file are valid", async () => {
    const user = userEvent.setup();
    render(<UploadForm {...defaultProps} />);

    // Enter valid email
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");
    await user.tab();

    // Upload file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile("test.jpg", "image/jpeg");

    await waitFor(() => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /start/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  // =============================================================================
  // Submit Tests
  // =============================================================================

  it("calls onSubmit with email and file when form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<UploadForm onSubmit={onSubmit} />);

    // Enter valid email
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, "test@example.com");
    await user.tab();

    // Upload file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile("test.jpg", "image/jpeg");

    await waitFor(() => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Wait for button to be enabled
    await waitFor(() => {
      const submitButton = screen.getByRole("button", { name: /start/i });
      expect(submitButton).not.toBeDisabled();
    });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /start/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: "test@example.com",
        file: expect.any(File),
      });
    });
  });

  it("prevents submission when disabled", async () => {
    const onSubmit = vi.fn();
    render(<UploadForm onSubmit={onSubmit} disabled />);

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toBeDisabled();
  });

  // =============================================================================
  // Loading State Tests
  // =============================================================================

  it("shows loading state when isLoading is true", () => {
    render(<UploadForm {...defaultProps} isLoading />);

    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
  });

  it("disables form during loading", () => {
    render(<UploadForm {...defaultProps} isLoading />);

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toBeDisabled();
  });

  // =============================================================================
  // Helper Text Tests
  // =============================================================================

  it("shows email-specific helper when only file is missing", async () => {
    render(<UploadForm {...defaultProps} />);

    // Upload file first
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createMockFile("test.jpg", "image/jpeg");

    await waitFor(() => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/enter your email to continue/i)).toBeInTheDocument();
    });
  });
});
