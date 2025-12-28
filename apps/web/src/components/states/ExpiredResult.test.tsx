import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExpiredResult } from "./ExpiredResult";
import * as posthogModule from "@/lib/posthog";

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock PostHog
vi.mock("@/lib/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
  isPostHogConfigured: vi.fn(() => true),
}));

describe("ExpiredResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("displays warm expired message", () => {
      render(<ExpiredResult source="result" />);

      expect(screen.getByText("This photo has moved on")).toBeInTheDocument();
      expect(screen.getByText(/automatically deleted after 30 days/i)).toBeInTheDocument();
    });

    it("displays privacy explanation", () => {
      render(<ExpiredResult source="result" />);

      expect(screen.getByText(/Why we do this:/i)).toBeInTheDocument();
      expect(screen.getByText(/ultrasound images are personal/i)).toBeInTheDocument();
    });

    it("displays create new CTA button", () => {
      render(<ExpiredResult source="result" />);

      expect(screen.getByRole("button", { name: /Create a New Portrait/i })).toBeInTheDocument();
    });

    it("displays time estimate", () => {
      render(<ExpiredResult source="result" />);

      expect(screen.getByText(/It only takes 90 seconds/i)).toBeInTheDocument();
    });

    it("does not show broken image or error icon", () => {
      const { container } = render(<ExpiredResult source="result" />);

      // Should not have red error styling
      expect(container.querySelector(".bg-red-100")).not.toBeInTheDocument();
      // Should have warm coral styling
      expect(container.querySelector(".bg-coral\\/10")).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("navigates to home when CTA is clicked", () => {
      render(<ExpiredResult source="result" />);

      const ctaButton = screen.getByRole("button", {
        name: /Create a New Portrait/i,
      });
      fireEvent.click(ctaButton);

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  describe("analytics", () => {
    it("tracks expired_result_viewed for result page", () => {
      render(<ExpiredResult resultId="test-result-123" source="result" />);

      expect(posthogModule.posthog.capture).toHaveBeenCalledWith(
        "expired_result_viewed",
        expect.objectContaining({
          result_id: "test-result-123",
          source: "result",
          timestamp: expect.any(String),
        }),
      );
    });

    it("tracks expired_result_viewed for share page", () => {
      render(<ExpiredResult resultId="share-456" source="share" />);

      expect(posthogModule.posthog.capture).toHaveBeenCalledWith(
        "expired_result_viewed",
        expect.objectContaining({
          result_id: "share-456",
          source: "share",
          timestamp: expect.any(String),
        }),
      );
    });

    it("only tracks analytics once", () => {
      const { rerender } = render(<ExpiredResult resultId="test-123" source="result" />);

      // Re-render to trigger effect again
      rerender(<ExpiredResult resultId="test-123" source="result" />);

      expect(posthogModule.posthog.capture).toHaveBeenCalledTimes(1);
    });

    it("does not track when PostHog is not configured", () => {
      vi.mocked(posthogModule.isPostHogConfigured).mockReturnValue(false);

      render(<ExpiredResult resultId="test-123" source="result" />);

      expect(posthogModule.posthog.capture).not.toHaveBeenCalled();
    });
  });
});
