import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { ResultsGallery, type ResultVariant } from "./ResultsGallery";

vi.mock("@/lib/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
  isPostHogConfigured: vi.fn(() => false),
}));

describe("ResultsGallery", () => {
  const baseResult: ResultVariant = {
    resultId: "result-1",
    resultUrl: "https://example.com/result.jpg",
    previewUrl: "https://example.com/preview.jpg",
    promptVersion: "v3",
    variantIndex: 0,
  };

  const originalImage = globalThis.Image;
  const imageSrcAssignments: string[] = [];
  const drawImageSpy = vi.fn();

  class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    crossOrigin = "";
    width = 800;
    height = 800;

    set src(value: string) {
      imageSrcAssignments.push(value);

      // Keep tests bounded even if a regression causes re-load loops.
      if (imageSrcAssignments.length <= 6) {
        setTimeout(() => {
          this.onload?.();
        }, 0);
      }
    }
  }

  beforeEach(() => {
    imageSrcAssignments.length = 0;
    drawImageSpy.mockClear();

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () =>
        ({
          clearRect: vi.fn(),
          drawImage: drawImageSpy,
          save: vi.fn(),
          translate: vi.fn(),
          rotate: vi.fn(),
          fillText: vi.fn(),
          restore: vi.fn(),
        }) as unknown as CanvasRenderingContext2D,
    );

    vi.stubGlobal("Image", MockImage as unknown as typeof Image);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("Image", originalImage);
  });

  it("loads canvas image once despite re-renders", async () => {
    render(
      <ResultsGallery
        results={[baseResult]}
        selectedIndex={0}
        onSelect={vi.fn()}
        hasPurchased={false}
      />,
    );

    await waitFor(() => {
      expect(imageSrcAssignments.length).toBeGreaterThan(0);
    });

    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(imageSrcAssignments).toHaveLength(1);
    expect(drawImageSpy).toHaveBeenCalled();
    expect(drawImageSpy.mock.calls[0]).toHaveLength(9);
  });

  it("ignores duplicate onLoad events for the same image", async () => {
    const onAllImagesLoaded = vi.fn();

    render(
      <ResultsGallery
        results={[baseResult]}
        selectedIndex={0}
        onSelect={vi.fn()}
        hasPurchased={true}
        onAllImagesLoaded={onAllImagesLoaded}
      />,
    );

    const image = screen.getByAltText("Baby portrait - Style A");
    fireEvent.load(image);
    fireEvent.load(image);

    await waitFor(() => {
      expect(onAllImagesLoaded).toHaveBeenCalledTimes(1);
    });
  });
});
