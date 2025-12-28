import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DeleteDataButton } from "./DeleteDataButton";

// Mock PostHog
vi.mock("@/lib/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
  isPostHogConfigured: vi.fn(() => true),
}));

// Mock API config
vi.mock("@/lib/api-config", () => ({
  API_BASE_URL: "http://localhost:3000",
}));

// Mock session module
vi.mock("@/lib/session", () => ({
  clearSession: vi.fn(),
}));

// Mock TanStack Router
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { posthog } from "@/lib/posthog";
import { toast } from "sonner";
import { clearSession } from "@/lib/session";

describe("DeleteDataButton", () => {
  const defaultProps = {
    uploadId: "test-upload-123",
    sessionToken: "test-session-token-456",
  };

  // Mock fetch
  const mockFetch = vi.fn();
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
  });

  describe("AC-1: Confirmation dialog shows", () => {
    it("should render delete button", () => {
      render(<DeleteDataButton {...defaultProps} />);

      expect(screen.getByText("Delete My Data")).toBeInTheDocument();
    });

    it("should show confirmation dialog when clicked", async () => {
      render(<DeleteDataButton {...defaultProps} />);

      const button = screen.getByText("Delete My Data");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Delete Your Data?")).toBeInTheDocument();
        expect(
          screen.getByText(/This will permanently delete your ultrasound image/),
        ).toBeInTheDocument();
      });
    });

    it("should show Cancel and Delete Everything buttons in dialog", async () => {
      render(<DeleteDataButton {...defaultProps} />);

      const button = screen.getByText("Delete My Data");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
        expect(screen.getByText("Delete Everything")).toBeInTheDocument();
      });
    });

    it("should close dialog when Cancel is clicked", async () => {
      render(<DeleteDataButton {...defaultProps} />);

      // Open dialog
      fireEvent.click(screen.getByText("Delete My Data"));

      await waitFor(() => {
        expect(screen.getByText("Delete Your Data?")).toBeInTheDocument();
      });

      // Click cancel
      fireEvent.click(screen.getByText("Cancel"));

      await waitFor(() => {
        expect(screen.queryByText("Delete Your Data?")).not.toBeInTheDocument();
      });
    });
  });

  describe("AC-2: API call", () => {
    it("should call DELETE /api/data/:token when confirmed", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, message: "Your data has been deleted" }),
      });

      render(<DeleteDataButton {...defaultProps} />);

      // Open dialog and confirm
      fireEvent.click(screen.getByText("Delete My Data"));
      await waitFor(() => {
        expect(screen.getByText("Delete Everything")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Delete Everything"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:3000/api/data/test-session-token-456",
          { method: "DELETE" },
        );
      });
    });
  });

  describe("AC-5: Success confirmation", () => {
    it("should show success toast on successful deletion", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<DeleteDataButton {...defaultProps} />);

      fireEvent.click(screen.getByText("Delete My Data"));
      await waitFor(() => {
        expect(screen.getByText("Delete Everything")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Delete Everything"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Your data has been deleted");
      });
    });
  });

  describe("AC-6: Redirect to homepage", () => {
    it("should navigate to homepage after successful deletion", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<DeleteDataButton {...defaultProps} />);

      fireEvent.click(screen.getByText("Delete My Data"));
      await waitFor(() => {
        expect(screen.getByText("Delete Everything")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Delete Everything"));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
      });
    });
  });

  describe("AC-7: Clear localStorage", () => {
    it("should clear session from localStorage", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<DeleteDataButton {...defaultProps} />);

      fireEvent.click(screen.getByText("Delete My Data"));
      await waitFor(() => {
        expect(screen.getByText("Delete Everything")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Delete Everything"));

      await waitFor(() => {
        expect(clearSession).toHaveBeenCalledWith("test-upload-123");
      });
    });

    it("should clear result mapping from localStorage", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<DeleteDataButton {...defaultProps} />);

      fireEvent.click(screen.getByText("Delete My Data"));
      await waitFor(() => {
        expect(screen.getByText("Delete Everything")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Delete Everything"));

      await waitFor(() => {
        expect(window.localStorage.removeItem).toHaveBeenCalledWith(
          "babypeek-result-upload-test-upload-123",
        );
      });
    });
  });

  describe("Analytics tracking", () => {
    it("should track data_deletion_requested event", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<DeleteDataButton {...defaultProps} />);

      fireEvent.click(screen.getByText("Delete My Data"));
      await waitFor(() => {
        expect(screen.getByText("Delete Everything")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Delete Everything"));

      await waitFor(() => {
        expect(posthog.capture).toHaveBeenCalledWith("data_deletion_requested", {
          upload_id: "test-upload-123",
        });
      });
    });

    it("should track data_deletion_completed event on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<DeleteDataButton {...defaultProps} />);

      fireEvent.click(screen.getByText("Delete My Data"));
      await waitFor(() => {
        expect(screen.getByText("Delete Everything")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Delete Everything"));

      await waitFor(() => {
        expect(posthog.capture).toHaveBeenCalledWith("data_deletion_completed", {
          upload_id: "test-upload-123",
        });
      });
    });
  });

  describe("Error handling", () => {
    it("should show error toast on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<DeleteDataButton {...defaultProps} />);

      fireEvent.click(screen.getByText("Delete My Data"));
      await waitFor(() => {
        expect(screen.getByText("Delete Everything")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Delete Everything"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Couldn't delete your data. Please try again.");
      });
    });

    it("should not navigate on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Server error" }),
      });

      render(<DeleteDataButton {...defaultProps} />);

      fireEvent.click(screen.getByText("Delete My Data"));
      await waitFor(() => {
        expect(screen.getByText("Delete Everything")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Delete Everything"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should show loading state during deletion", async () => {
      // Mock a slow response
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<DeleteDataButton {...defaultProps} />);

      fireEvent.click(screen.getByText("Delete My Data"));
      await waitFor(() => {
        expect(screen.getByText("Delete Everything")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Delete Everything"));

      await waitFor(() => {
        expect(screen.getByText("Deleting...")).toBeInTheDocument();
      });
    });
  });
});
