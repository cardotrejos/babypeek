import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { RevealUI } from "./RevealUI";
import { DEFAULT_TIER, PRICING_TIERS } from "@/lib/pricing";

// Mock PostHog for DownloadPreviewButton and CheckoutButton
vi.mock("@/lib/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
  isPostHogConfigured: vi.fn(() => false),
}));

// Mock API config
vi.mock("@/lib/api-config", () => ({
  API_BASE_URL: "http://localhost:3000",
}));

describe("RevealUI", () => {
  const defaultProps = {
    resultId: "test-result-123",
    uploadId: "test-upload-123",
    previewUrl: "https://example.com/preview.jpg",
    onShare: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render primary CTA button (CheckoutButton)", () => {
      render(<RevealUI {...defaultProps} />);

      const purchaseButton = screen.getByRole("button", {
        name: /Get HD Version/i,
      });
      expect(purchaseButton).toBeInTheDocument();
    });

    it("should not render share button for unpaid users", () => {
      render(<RevealUI {...defaultProps} />);

      const shareButton = screen.queryByRole("button", { name: /^Share$/ });
      expect(shareButton).not.toBeInTheDocument();
    });

    it("should render share button for paid users", () => {
      render(<RevealUI {...defaultProps} hasPurchasedProp={true} />);

      const shareButton = screen.getByRole("button", { name: /^Share$/ });
      expect(shareButton).toBeInTheDocument();
    });

    it("should render WhatsApp share button for paid users (Story 8.1)", () => {
      render(<RevealUI {...defaultProps} hasPurchasedProp={true} />);

      const whatsappButton = screen.getByRole("button", {
        name: /share to whatsapp/i,
      });
      expect(whatsappButton).toBeInTheDocument();
    });

    it("should not render WhatsApp share button for unpaid users", () => {
      render(<RevealUI {...defaultProps} />);

      const whatsappButton = screen.queryByRole("button", {
        name: /share to whatsapp/i,
      });
      expect(whatsappButton).not.toBeInTheDocument();
    });

    it("should display price in CTA", () => {
      render(<RevealUI {...defaultProps} />);

      expect(screen.getByTestId("checkout-button")).toHaveTextContent(
        PRICING_TIERS[DEFAULT_TIER].priceDisplay,
      );
    });
  });

  describe("Interactions", () => {
    it("should call onShare when share button clicked", () => {
      const onShare = vi.fn();
      render(<RevealUI {...defaultProps} onShare={onShare} hasPurchasedProp={true} />);

      // Get the original Share button (exact text match)
      const shareButton = screen.getByRole("button", { name: /^Share$/ });
      fireEvent.click(shareButton);

      expect(onShare).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it("should have accessible container", () => {
      render(<RevealUI {...defaultProps} />);

      const container = screen.getByTestId("reveal-ui-container");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Comparison Toggle (Story 5.5)", () => {
    it("should not show compare button when hasOriginalImage is false", () => {
      render(<RevealUI {...defaultProps} hasOriginalImage={false} />);

      expect(screen.queryByTestId("compare-toggle")).not.toBeInTheDocument();
    });

    it("should not show compare button when onToggleComparison is not provided", () => {
      render(<RevealUI {...defaultProps} hasOriginalImage={true} />);

      expect(screen.queryByTestId("compare-toggle")).not.toBeInTheDocument();
    });

    it("should show compare button when hasOriginalImage and onToggleComparison are provided", () => {
      const onToggleComparison = vi.fn();
      render(
        <RevealUI
          {...defaultProps}
          hasOriginalImage={true}
          onToggleComparison={onToggleComparison}
        />,
      );

      expect(screen.getByTestId("compare-toggle")).toBeInTheDocument();
    });

    it("should show 'Compare with Original' when comparison is not active", () => {
      const onToggleComparison = vi.fn();
      render(
        <RevealUI
          {...defaultProps}
          hasOriginalImage={true}
          showComparison={false}
          onToggleComparison={onToggleComparison}
        />,
      );

      expect(screen.getByText("Compare with Original")).toBeInTheDocument();
    });

    it("should show 'Hide Comparison' when comparison is active", () => {
      const onToggleComparison = vi.fn();
      render(
        <RevealUI
          {...defaultProps}
          hasOriginalImage={true}
          showComparison={true}
          onToggleComparison={onToggleComparison}
        />,
      );

      expect(screen.getByText("Hide Comparison")).toBeInTheDocument();
    });

    it("should call onToggleComparison when compare button clicked", () => {
      const onToggleComparison = vi.fn();
      render(
        <RevealUI
          {...defaultProps}
          hasOriginalImage={true}
          onToggleComparison={onToggleComparison}
        />,
      );

      const compareButton = screen.getByTestId("compare-toggle");
      fireEvent.click(compareButton);

      expect(onToggleComparison).toHaveBeenCalledTimes(1);
    });
  });
});
