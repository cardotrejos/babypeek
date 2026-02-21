import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { OfflineBanner } from "./offline-banner";

const mockUseOnlineStatus = vi.fn();

vi.mock("@/hooks/use-online-status", () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

describe("OfflineBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a global message when offline", () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      checkStatus: vi.fn().mockResolvedValue(false),
    });

    render(<OfflineBanner />);

    expect(screen.getByRole("status")).toHaveTextContent("You're offline right now");
  });

  it("does not render anything when online", () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      checkStatus: vi.fn().mockResolvedValue(true),
    });

    render(<OfflineBanner />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
