import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, userEvent } from "@/test/test-utils";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

const TEST_BEFORE_IMAGE = "https://example.com/before.jpg";
const TEST_AFTER_IMAGE = "https://example.com/after.jpg";

describe("BeforeAfterSlider", () => {
  // Mock getBoundingClientRect for position calculations
  const mockGetBoundingClientRect = vi.fn(() => ({
    left: 0,
    right: 400,
    top: 0,
    bottom: 300,
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    toJSON: () => {},
  }));

  beforeEach(() => {
    // Reset mock
    mockGetBoundingClientRect.mockClear();
    // Mock Element.prototype.getBoundingClientRect
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      mockGetBoundingClientRect,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("renders both images with correct alt text", () => {
      render(<BeforeAfterSlider beforeImage={TEST_BEFORE_IMAGE} afterImage={TEST_AFTER_IMAGE} />);

      expect(screen.getByAltText("Original")).toBeInTheDocument();
      expect(screen.getByAltText("AI Generated")).toBeInTheDocument();
    });

    it("renders custom labels", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          beforeLabel="Your Ultrasound"
          afterLabel="AI Portrait"
        />,
      );

      expect(screen.getByText("Your Ultrasound")).toBeInTheDocument();
      expect(screen.getByText("AI Portrait")).toBeInTheDocument();
    });

    it("renders slider handle", () => {
      render(<BeforeAfterSlider beforeImage={TEST_BEFORE_IMAGE} afterImage={TEST_AFTER_IMAGE} />);

      expect(screen.getByTestId("slider-handle")).toBeInTheDocument();
    });

    it("sets initial position correctly", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={30}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");
      expect(slider).toHaveAttribute("aria-valuenow", "30");
    });
  });

  describe("Accessibility (AC-3, Task 4)", () => {
    it("has correct ARIA attributes", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      expect(slider).toHaveAttribute("role", "slider");
      expect(slider).toHaveAttribute("aria-label", "Image comparison slider");
      expect(slider).toHaveAttribute("aria-valuemin", "0");
      expect(slider).toHaveAttribute("aria-valuemax", "100");
      expect(slider).toHaveAttribute("aria-valuenow", "50");
      expect(slider).toHaveAttribute("aria-valuetext", "50% showing original image");
    });

    it("is focusable via tabIndex", () => {
      render(<BeforeAfterSlider beforeImage={TEST_BEFORE_IMAGE} afterImage={TEST_AFTER_IMAGE} />);

      const slider = screen.getByTestId("before-after-slider");
      expect(slider).toHaveAttribute("tabIndex", "0");
    });

    it("has focus visible indicator classes", () => {
      render(<BeforeAfterSlider beforeImage={TEST_BEFORE_IMAGE} afterImage={TEST_AFTER_IMAGE} />);

      const slider = screen.getByTestId("before-after-slider");
      expect(slider).toHaveClass("focus-visible:ring-2");
    });
  });

  describe("Keyboard controls (AC-3, Task 4)", () => {
    it("ArrowLeft decreases position by 5%", async () => {
      const user = userEvent.setup();

      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      slider.focus();
      await user.keyboard("{ArrowLeft}");

      expect(slider).toHaveAttribute("aria-valuenow", "45");
    });

    it("ArrowRight increases position by 5%", async () => {
      const user = userEvent.setup();

      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      slider.focus();
      await user.keyboard("{ArrowRight}");

      expect(slider).toHaveAttribute("aria-valuenow", "55");
    });

    it("Home sets position to 0%", async () => {
      const user = userEvent.setup();

      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      slider.focus();
      await user.keyboard("{Home}");

      expect(slider).toHaveAttribute("aria-valuenow", "0");
    });

    it("End sets position to 100%", async () => {
      const user = userEvent.setup();

      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      slider.focus();
      await user.keyboard("{End}");

      expect(slider).toHaveAttribute("aria-valuenow", "100");
    });

    it("does not go below 0%", async () => {
      const user = userEvent.setup();

      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={2}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      slider.focus();
      await user.keyboard("{ArrowLeft}");

      expect(slider).toHaveAttribute("aria-valuenow", "0");
    });

    it("does not go above 100%", async () => {
      const user = userEvent.setup();

      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={98}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      slider.focus();
      await user.keyboard("{ArrowRight}");

      expect(slider).toHaveAttribute("aria-valuenow", "100");
    });
  });

  describe("Mouse drag interaction (AC-1, Task 2)", () => {
    it("updates position on mousedown", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      // Click at 25% of the width (100px out of 400px)
      fireEvent.mouseDown(slider, { clientX: 100 });

      // Should update to 25%
      expect(slider).toHaveAttribute("aria-valuenow", "25");
    });

    it("updates position on mousemove while dragging", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      // Start dragging at center
      fireEvent.mouseDown(slider, { clientX: 200 });

      // Move to 75% (300px)
      fireEvent.mouseMove(document, { clientX: 300 });

      expect(slider).toHaveAttribute("aria-valuenow", "75");
    });

    it("stops updating on mouseup", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      // Start dragging
      fireEvent.mouseDown(slider, { clientX: 200 });

      // Stop dragging
      fireEvent.mouseUp(document);

      // Move mouse (should not update position)
      fireEvent.mouseMove(document, { clientX: 100 });

      // Position should still be 50% from the initial mouseDown
      expect(slider).toHaveAttribute("aria-valuenow", "50");
    });

    it("clamps position to valid range", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      // Try to drag beyond right edge
      fireEvent.mouseDown(slider, { clientX: 500 });
      expect(slider).toHaveAttribute("aria-valuenow", "100");

      // Try to drag beyond left edge
      fireEvent.mouseDown(slider, { clientX: -100 });
      expect(slider).toHaveAttribute("aria-valuenow", "0");
    });
  });

  describe("Touch interaction (Task 2)", () => {
    it("updates position on touchstart", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      // Touch at 25% of width
      fireEvent.touchStart(slider, {
        touches: [{ clientX: 100 }],
      });

      expect(slider).toHaveAttribute("aria-valuenow", "25");
    });

    it("updates position on touchmove while dragging", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      // Start touch at center
      fireEvent.touchStart(slider, {
        touches: [{ clientX: 200 }],
      });

      // Move to 75%
      fireEvent.touchMove(slider, {
        touches: [{ clientX: 300 }],
      });

      expect(slider).toHaveAttribute("aria-valuenow", "75");
    });

    it("stops updating on touchend", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          initialPosition={50}
        />,
      );

      const slider = screen.getByTestId("before-after-slider");

      // Start touch
      fireEvent.touchStart(slider, {
        touches: [{ clientX: 200 }],
      });

      // End touch
      fireEvent.touchEnd(document);

      // Touch move should not update (isDragging = false)
      fireEvent.touchMove(slider, {
        touches: [{ clientX: 100 }],
      });

      // Position should still be 50%
      expect(slider).toHaveAttribute("aria-valuenow", "50");
    });
  });

  describe("Touch target size (AC-2, NFR-5.5)", () => {
    it("slider handle has minimum 48px touch target", () => {
      render(<BeforeAfterSlider beforeImage={TEST_BEFORE_IMAGE} afterImage={TEST_AFTER_IMAGE} />);

      const handle = screen.getByTestId("slider-handle");
      const grip = handle.querySelector(".w-12.h-12");

      expect(grip).toBeInTheDocument();
      // w-12 = 48px in Tailwind
    });
  });

  describe("Image dimensions (AC-4, Task 5)", () => {
    it("container maintains 4:3 aspect ratio", () => {
      render(<BeforeAfterSlider beforeImage={TEST_BEFORE_IMAGE} afterImage={TEST_AFTER_IMAGE} />);

      const slider = screen.getByTestId("before-after-slider");
      expect(slider).toHaveClass("aspect-[4/3]");
    });

    it("both images use object-cover for equal sizing", () => {
      render(<BeforeAfterSlider beforeImage={TEST_BEFORE_IMAGE} afterImage={TEST_AFTER_IMAGE} />);

      const images = screen.getAllByRole("img");
      for (const img of images) {
        expect(img).toHaveClass("object-cover");
      }
    });
  });

  describe("Visual feedback", () => {
    it("applies custom className", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          className="custom-class"
        />,
      );

      const slider = screen.getByTestId("before-after-slider");
      expect(slider).toHaveClass("custom-class");
    });

    it("shows labels for both images", () => {
      render(
        <BeforeAfterSlider
          beforeImage={TEST_BEFORE_IMAGE}
          afterImage={TEST_AFTER_IMAGE}
          beforeLabel="Before"
          afterLabel="After"
        />,
      );

      expect(screen.getByText("Before")).toBeInTheDocument();
      expect(screen.getByText("After")).toBeInTheDocument();
    });
  });
});
