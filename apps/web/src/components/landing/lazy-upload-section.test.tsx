// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalIntersectionObserver = window.IntersectionObserver;

vi.mock("./upload-section", () => ({
  UploadSection: () => (
    <section>
      <h2>Upload your ultrasound</h2>
      <button aria-label="Upload your 4D ultrasound image" type="button">
        Upload
      </button>
      <label>
        Email address
        <input aria-label="Email address" type="email" />
      </label>
    </section>
  ),
}));

import { LazyUploadSection } from "./lazy-upload-section";

afterEach(() => {
  cleanup();
  if (originalIntersectionObserver) {
    window.IntersectionObserver = originalIntersectionObserver;
    return;
  }
  Reflect.deleteProperty(window, "IntersectionObserver");
});

describe("LazyUploadSection", () => {
  it("loads immediately when IntersectionObserver is unavailable", async () => {
    Reflect.deleteProperty(window, "IntersectionObserver");

    render(<LazyUploadSection id="upload" />);

    expect(
      await screen.findByRole("heading", { name: /^upload your ultrasound$/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /upload your 4d ultrasound image/i }),
    ).toBeVisible();
    expect(screen.getByLabelText(/email address/i)).toBeVisible();
  });
});
