import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DownloadPreviewButton, detectIOS } from "./DownloadPreviewButton";

// Mock PostHog
vi.mock("@/lib/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
  isPostHogConfigured: vi.fn(() => true),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("DownloadPreviewButton", () => {
  const defaultProps = {
    previewUrl: "https://example.com/preview.jpg",
    resultId: "test-result-123",
  };

  // Mock fetch and URL methods
  const mockFetch = vi.fn();
  const mockCreateObjectURL = vi.fn(() => "blob:test-url");
  const mockRevokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Default successful fetch
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["test"], { type: "image/jpeg" })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render download button", () => {
      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      expect(button).toBeInTheDocument();
    });

    it("should render download icon", () => {
      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      expect(button.querySelector("svg")).toBeInTheDocument();
    });

    it("should accept variant prop", () => {
      const { rerender } = render(<DownloadPreviewButton {...defaultProps} variant="outline" />);

      const button = screen.getByRole("button");
      // Verify button renders with variant (actual class testing depends on shadcn implementation)
      expect(button).toBeInTheDocument();

      rerender(<DownloadPreviewButton {...defaultProps} variant="ghost" />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("Download functionality", () => {
    it("should trigger download when button clicked", async () => {
      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(defaultProps.previewUrl);
      });
    });

    it("should show loading state during download", async () => {
      // Slow fetch to observe loading state
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  blob: () => Promise.resolve(new Blob(["test"])),
                }),
              100,
            ),
          ),
      );

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByText(/downloading/i)).toBeInTheDocument();
      });
    });

    it("should disable button during download", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  blob: () => Promise.resolve(new Blob(["test"])),
                }),
              100,
            ),
          ),
      );

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe("Error handling", () => {
    it("should show error message on download failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      await waitFor(() => {
        // Network errors are caught and re-thrown with standardized message
        expect(screen.getByText(/failed to fetch image/i)).toBeInTheDocument();
      });
    });

    it("should show error when fetch response is not ok", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch image/i)).toBeInTheDocument();
      });
    });

    it("should display error with accessible role", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });
    });
  });

  describe("Filename format (AC-2)", () => {
    it("should create download link with date-based filename", async () => {
      // Mock createElement to capture the download attribute
      const originalCreateElement = document.createElement.bind(document);
      let capturedFilename = "";

      vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === "a") {
          Object.defineProperty(element, "download", {
            set(value: string) {
              capturedFilename = value;
            },
            get() {
              return capturedFilename;
            },
          });
        }
        return element;
      });

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      await waitFor(() => {
        // Verify filename matches pattern: babypeek-preview-YYYY-MM-DD.jpg
        expect(capturedFilename).toMatch(/^babypeek-preview-\d{4}-\d{2}-\d{2}\.jpg$/);
      });
    });

    it("should use current date in filename", async () => {
      const originalCreateElement = document.createElement.bind(document);
      let capturedFilename = "";

      vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === "a") {
          Object.defineProperty(element, "download", {
            set(value: string) {
              capturedFilename = value;
            },
            get() {
              return capturedFilename;
            },
          });
        }
        return element;
      });

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      const today = new Date().toISOString().split("T")[0];

      await waitFor(() => {
        expect(capturedFilename).toBe(`babypeek-preview-${today}.jpg`);
      });
    });
  });

  describe("Analytics (AC-3)", () => {
    it("should track preview_download_started when button clicked", async () => {
      const { posthog } = await import("@/lib/posthog");

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(posthog.capture).toHaveBeenCalledWith(
          "preview_download_started",
          expect.objectContaining({
            result_id: defaultProps.resultId,
          }),
        );
      });
    });

    it("should track preview_download_completed on success", async () => {
      const { posthog } = await import("@/lib/posthog");

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(posthog.capture).toHaveBeenCalledWith(
          "preview_download_completed",
          expect.objectContaining({
            result_id: defaultProps.resultId,
          }),
        );
      });
    });

    it("should track preview_download_failed on error", async () => {
      const { posthog } = await import("@/lib/posthog");
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(posthog.capture).toHaveBeenCalledWith(
          "preview_download_failed",
          expect.objectContaining({
            result_id: defaultProps.resultId,
          }),
        );
      });
    });
  });

  describe("iOS Detection (M2 Fix)", () => {
    it("detectIOS returns false for non-iOS user agents", () => {
      // Default jsdom user agent is not iOS
      expect(detectIOS()).toBe(false);
    });

    it("detectIOS returns true for iPhone user agent", () => {
      const originalNavigator = global.navigator;
      Object.defineProperty(global, "navigator", {
        value: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)" },
        writable: true,
      });

      expect(detectIOS()).toBe(true);

      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });

    it("detectIOS returns true for iPad user agent", () => {
      const originalNavigator = global.navigator;
      Object.defineProperty(global, "navigator", {
        value: { userAgent: "Mozilla/5.0 (iPad; CPU OS 14_0)" },
        writable: true,
      });

      expect(detectIOS()).toBe(true);

      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });
  });

  describe("iOS Toast Messaging (H1 Fix)", () => {
    it("should show toast with instructions on iOS", async () => {
      const { toast } = await import("sonner");
      const mockWindowOpen = vi.fn();
      const originalNavigator = global.navigator;
      const originalOpen = window.open;

      // Mock iOS
      Object.defineProperty(global, "navigator", {
        value: { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)" },
        writable: true,
      });
      window.open = mockWindowOpen;

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(defaultProps.previewUrl, "_blank");
        expect(toast.info).toHaveBeenCalledWith(
          "Saving on iOS",
          expect.objectContaining({
            description: expect.stringContaining("Long-press"),
          }),
        );
      });

      // Cleanup
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
      window.open = originalOpen;
    });
  });

  describe("Network Error Handling (M3 Fix)", () => {
    it("should show offline-specific message when navigator.onLine is false", async () => {
      const originalNavigator = global.navigator;
      Object.defineProperty(global, "navigator", {
        value: { ...originalNavigator, onLine: false },
        writable: true,
      });

      mockFetch.mockRejectedValue(new Error("Failed to fetch"));

      render(<DownloadPreviewButton {...defaultProps} />);

      const button = screen.getByRole("button", { name: /download preview/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/check your connection/i)).toBeInTheDocument();
      });

      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
      });
    });
  });
});
