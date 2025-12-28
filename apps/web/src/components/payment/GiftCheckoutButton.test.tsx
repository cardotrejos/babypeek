import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftCheckoutButton } from "./GiftCheckoutButton";

// Mock posthog
const mockIsPostHogConfigured = vi.fn(() => true);
vi.mock("@/lib/posthog", () => ({
  posthog: { capture: vi.fn() },
  isPostHogConfigured: () => mockIsPostHogConfigured(),
}));

// Mock sentry
vi.mock("@/lib/sentry", () => ({
  addBreadcrumb: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocationHref = vi.fn();
Object.defineProperty(window, "location", {
  value: { href: "" },
  writable: true,
});

describe("GiftCheckoutButton - Story 6.7", () => {
  const defaultProps = {
    shareId: "share_123",
    uploadId: "upload_123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("Initial Render", () => {
    it("renders gift button with price", () => {
      render(<GiftCheckoutButton {...defaultProps} />);

      expect(screen.getByTestId("gift-checkout-button")).toBeInTheDocument();
      expect(screen.getByText(/Gift This Photo/i)).toBeInTheDocument();
      expect(screen.getByText(/\$9\.99/)).toBeInTheDocument();
    });

    it("shows gift emoji", () => {
      render(<GiftCheckoutButton {...defaultProps} />);

      expect(screen.getByText(/🎁/)).toBeInTheDocument();
    });
  });

  describe("Email Modal", () => {
    it("opens email modal on button click", async () => {
      render(<GiftCheckoutButton {...defaultProps} />);

      const button = screen.getByTestId("gift-checkout-button");
      await userEvent.click(button);

      expect(screen.getByText(/Enter your email to receive your receipt/i)).toBeInTheDocument();
    });

    it("shows email input in modal", async () => {
      render(<GiftCheckoutButton {...defaultProps} />);

      await userEvent.click(screen.getByTestId("gift-checkout-button"));

      expect(screen.getByTestId("gift-email-input")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/your@email.com/i)).toBeInTheDocument();
    });

    it("shows continue button disabled without email", async () => {
      render(<GiftCheckoutButton {...defaultProps} />);

      await userEvent.click(screen.getByTestId("gift-checkout-button"));

      const continueButton = screen.getByTestId("gift-continue-button");
      expect(continueButton).toBeDisabled();
    });

    it("enables continue button with valid email", async () => {
      render(<GiftCheckoutButton {...defaultProps} />);

      await userEvent.click(screen.getByTestId("gift-checkout-button"));
      await userEvent.type(screen.getByTestId("gift-email-input"), "test@example.com");

      const continueButton = screen.getByTestId("gift-continue-button");
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe("Checkout Flow", () => {
    it("calls gift checkout API with correct params", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ checkoutUrl: "https://checkout.stripe.com/test" }),
      });

      render(<GiftCheckoutButton {...defaultProps} />);

      await userEvent.click(screen.getByTestId("gift-checkout-button"));
      await userEvent.type(screen.getByTestId("gift-email-input"), "purchaser@example.com");
      await userEvent.click(screen.getByTestId("gift-continue-button"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/checkout/gift"),
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              uploadId: "upload_123",
              purchaserEmail: "purchaser@example.com",
            }),
          }),
        );
      });
    });

    it("redirects to Stripe checkout URL on success", async () => {
      const checkoutUrl = "https://checkout.stripe.com/gift_session";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ checkoutUrl }),
      });

      render(<GiftCheckoutButton {...defaultProps} />);

      await userEvent.click(screen.getByTestId("gift-checkout-button"));
      await userEvent.type(screen.getByTestId("gift-email-input"), "test@example.com");
      await userEvent.click(screen.getByTestId("gift-continue-button"));

      await waitFor(() => {
        expect(window.location.href).toBe(checkoutUrl);
      });
    });

    it("shows loading state during checkout", async () => {
      // Make fetch hang
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<GiftCheckoutButton {...defaultProps} />);

      await userEvent.click(screen.getByTestId("gift-checkout-button"));
      await userEvent.type(screen.getByTestId("gift-email-input"), "test@example.com");
      await userEvent.click(screen.getByTestId("gift-continue-button"));

      expect(screen.getByText(/Processing/i)).toBeInTheDocument();
    });
  });

  describe("Email Validation", () => {
    it("shows error for invalid email format", async () => {
      render(<GiftCheckoutButton {...defaultProps} />);

      await userEvent.click(screen.getByTestId("gift-checkout-button"));
      await userEvent.type(screen.getByTestId("gift-email-input"), "invalid-email");
      await userEvent.click(screen.getByTestId("gift-continue-button"));

      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  describe("Analytics (AC-6)", () => {
    it("tracks gift_cta_clicked on CTA click (Story 8.5)", async () => {
      const { posthog } = await import("@/lib/posthog");

      render(<GiftCheckoutButton {...defaultProps} />);
      await userEvent.click(screen.getByTestId("gift-checkout-button"));

      expect(posthog.capture).toHaveBeenCalledWith("gift_cta_clicked", {
        share_id: "share_123",
        upload_id: "upload_123",
        source: "share_page",
      });
    });

    it("tracks gift_purchase_started when clicking Continue to Payment (H1 fix)", async () => {
      const { posthog } = await import("@/lib/posthog");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ checkoutUrl: "https://checkout.stripe.com/test" }),
      });

      render(<GiftCheckoutButton {...defaultProps} />);
      await userEvent.click(screen.getByTestId("gift-checkout-button"));

      // Should NOT have fired yet (only gift_cta_clicked should fire on modal open)
      expect(posthog.capture).not.toHaveBeenCalledWith("gift_purchase_started", expect.anything());

      // Enter email and click continue
      await userEvent.type(screen.getByTestId("gift-email-input"), "test@example.com");
      await userEvent.click(screen.getByTestId("gift-continue-button"));

      // NOW it should fire
      await waitFor(() => {
        expect(posthog.capture).toHaveBeenCalledWith("gift_purchase_started", {
          share_id: "share_123",
          upload_id: "upload_123",
        });
      });
    });

    it("tracks gift_checkout_created on successful checkout", async () => {
      const { posthog } = await import("@/lib/posthog");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ checkoutUrl: "https://checkout.stripe.com/test" }),
      });

      render(<GiftCheckoutButton {...defaultProps} />);

      await userEvent.click(screen.getByTestId("gift-checkout-button"));
      await userEvent.type(screen.getByTestId("gift-email-input"), "test@example.com");
      await userEvent.click(screen.getByTestId("gift-continue-button"));

      await waitFor(() => {
        expect(posthog.capture).toHaveBeenCalledWith(
          "gift_checkout_created",
          expect.objectContaining({
            share_id: "share_123",
            upload_id: "upload_123",
          }),
        );
      });
    });

    it("tracks gift_checkout_error on failure", async () => {
      const { posthog } = await import("@/lib/posthog");
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Test error" }),
      });

      render(<GiftCheckoutButton {...defaultProps} />);

      await userEvent.click(screen.getByTestId("gift-checkout-button"));
      await userEvent.type(screen.getByTestId("gift-email-input"), "test@example.com");
      await userEvent.click(screen.getByTestId("gift-continue-button"));

      await waitFor(() => {
        expect(posthog.capture).toHaveBeenCalledWith(
          "gift_checkout_error",
          expect.objectContaining({
            share_id: "share_123",
          }),
        );
      });
    });
  });

  describe("User Experience (AC-5)", () => {
    it("explains HD photo goes to parent", async () => {
      render(<GiftCheckoutButton {...defaultProps} />);

      await userEvent.click(screen.getByTestId("gift-checkout-button"));

      expect(screen.getByText(/HD photo will be sent directly to the parent/i)).toBeInTheDocument();
    });
  });

  describe("PostHog Disabled (M2 fix)", () => {
    it("works correctly when PostHog is disabled", async () => {
      mockIsPostHogConfigured.mockReturnValue(false);
      const { posthog } = await import("@/lib/posthog");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ checkoutUrl: "https://checkout.stripe.com/test" }),
      });

      render(<GiftCheckoutButton {...defaultProps} />);

      // Click CTA - should not throw
      await userEvent.click(screen.getByTestId("gift-checkout-button"));
      expect(screen.getByTestId("gift-email-input")).toBeInTheDocument();

      // Complete flow - should not throw
      await userEvent.type(screen.getByTestId("gift-email-input"), "test@example.com");
      await userEvent.click(screen.getByTestId("gift-continue-button"));

      // PostHog capture should not have been called
      expect(posthog.capture).not.toHaveBeenCalled();

      // But checkout should still work
      await waitFor(() => {
        expect(window.location.href).toBe("https://checkout.stripe.com/test");
      });

      // Reset mock for other tests
      mockIsPostHogConfigured.mockReturnValue(true);
    });
  });
});
