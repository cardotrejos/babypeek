import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CheckoutButton } from "./CheckoutButton";
import { DEFAULT_TIER, PRICING_TIERS } from "@/lib/pricing";

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
  getSession: vi.fn(() => "mock-session-token"),
}));

describe("CheckoutButton", () => {
  const defaultProps = {
    uploadId: "test-upload-123",
  };

  // Mock fetch
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render with price", () => {
      render(<CheckoutButton {...defaultProps} />);

      expect(screen.getByText(/Get HD Version/)).toBeInTheDocument();
      expect(
        screen.getByText(`Get HD Version - ${PRICING_TIERS[DEFAULT_TIER].priceDisplay}`),
      ).toBeInTheDocument();
    });

    it("should have checkout-button test id", () => {
      render(<CheckoutButton {...defaultProps} />);

      expect(screen.getByTestId("checkout-button")).toBeInTheDocument();
    });

    it("should be disabled when disabled prop is true", () => {
      render(<CheckoutButton {...defaultProps} disabled />);

      expect(screen.getByTestId("checkout-button")).toBeDisabled();
    });
  });

  describe("Checkout Flow", () => {
    it("should show loading state during checkout", async () => {
      // Mock a slow response
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<CheckoutButton {...defaultProps} />);

      const button = screen.getByTestId("checkout-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Processing/)).toBeInTheDocument();
      });
    });

    it("should call API with correct parameters including session token", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ checkoutUrl: "https://stripe.com/checkout" }),
      });

      render(<CheckoutButton {...defaultProps} />);

      const button = screen.getByTestId("checkout-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:3000/api/checkout",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Session-Token": "mock-session-token",
            },
            body: JSON.stringify({
              uploadId: "test-upload-123",
              type: "self",
              tier: DEFAULT_TIER,
            }),
          }),
        );
      });
    });

    it("should call onCheckoutError when session is missing", async () => {
      // Mock missing session
      const { getSession } = await import("@/lib/session");
      vi.mocked(getSession).mockReturnValueOnce(null);

      const onCheckoutError = vi.fn();
      render(<CheckoutButton {...defaultProps} onCheckoutError={onCheckoutError} />);

      const button = screen.getByTestId("checkout-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(onCheckoutError).toHaveBeenCalledWith("Session expired. Please start a new upload.");
      });
    });

    it("should call onCheckoutError on API failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Upload not found" }),
      });

      const onCheckoutError = vi.fn();
      render(<CheckoutButton {...defaultProps} onCheckoutError={onCheckoutError} />);

      const button = screen.getByTestId("checkout-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(onCheckoutError).toHaveBeenCalledWith("Upload not found");
      });
    });

    it("should call onCheckoutError on network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const onCheckoutError = vi.fn();
      render(<CheckoutButton {...defaultProps} onCheckoutError={onCheckoutError} />);

      const button = screen.getByTestId("checkout-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(onCheckoutError).toHaveBeenCalledWith("Network error");
      });
    });

    it("should not submit if already loading", async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<CheckoutButton {...defaultProps} />);

      const button = screen.getByTestId("checkout-button");
      fireEvent.click(button);
      fireEvent.click(button); // Second click while loading

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Analytics", () => {
    it("should track purchase_started event", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ checkoutUrl: "https://stripe.com/checkout" }),
      });

      const { posthog } = await import("@/lib/posthog");

      render(<CheckoutButton {...defaultProps} />);

      const button = screen.getByTestId("checkout-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(posthog.capture).toHaveBeenCalledWith("purchase_started", {
          uploadId: "test-upload-123",
          amount: PRICING_TIERS[DEFAULT_TIER].priceCents,
          tier: DEFAULT_TIER,
          retry_count: 0,
        });
      });
    });

    it("should track checkout_created event on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ checkoutUrl: "https://stripe.com/checkout" }),
      });

      const { posthog } = await import("@/lib/posthog");

      render(<CheckoutButton {...defaultProps} />);

      const button = screen.getByTestId("checkout-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(posthog.capture).toHaveBeenCalledWith("checkout_created", {
          uploadId: "test-upload-123",
          amount: PRICING_TIERS[DEFAULT_TIER].priceCents,
          tier: DEFAULT_TIER,
        });
      });
    });

    it("should track checkout_error event on failure", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Test error" }),
      });

      const { posthog } = await import("@/lib/posthog");

      render(<CheckoutButton {...defaultProps} />);

      const button = screen.getByTestId("checkout-button");
      fireEvent.click(button);

      await waitFor(() => {
        expect(posthog.capture).toHaveBeenCalledWith("checkout_error", {
          uploadId: "test-upload-123",
          error: "Test error",
        });
      });
    });
  });
});
