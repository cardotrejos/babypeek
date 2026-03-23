import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/BabyPeek/i);
  });

  test("displays hero section with headline", async ({ page }) => {
    await page.goto("/");

    // Check for main headline
    const headline = page.getByRole("heading", { level: 1 });
    await expect(headline).toBeVisible();
    await expect(headline).toHaveText(/Meet your baby.*before they arrive/i);
  });

  test("has CTA button", async ({ page }) => {
    await page.goto("/");

    // Check for at least one "Try it free" CTA button (there may be header + hero)
    const ctaButtons = page.getByRole("button", { name: /try it free/i });
    await expect(ctaButtons.first()).toBeVisible();
  });

  test("is mobile responsive", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Page should still be usable
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
  });

  test("CTA button has accessible touch target", async ({ page }) => {
    await page.goto("/");

    // Target the hero CTA button specifically (has aria-label distinguishing it from header button)
    const ctaButton = page.getByRole("button", { name: /try it free - upload your ultrasound/i });
    await expect(ctaButton).toBeVisible();

    // Check minimum touch target size (48px per WCAG; hero button has touch-target-lg = 56px min)
    const box = await ctaButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
    }
  });

  test("gallery images use lazy load and async decode", async ({ page }) => {
    await page.goto("/");
    const imgs = page.locator("#gallery img");
    const count = await imgs.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(imgs.nth(i)).toHaveAttribute("loading", "lazy");
      await expect(imgs.nth(i)).toHaveAttribute("decoding", "async");
    }
  });

  test("hero CTA reveals working upload section after lazy load", async ({ page }) => {
    await page.goto("/");
    const heroCta = page.getByRole("button", { name: /try it free - upload your ultrasound/i });
    await heroCta.click();
    const uploadRoot = page.locator("#upload");
    await expect(uploadRoot).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /^upload your ultrasound$/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      uploadRoot.getByRole("button", { name: /upload your 4d ultrasound image/i }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(uploadRoot.getByLabel(/email address/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("upload chunk loads when the user scrolls to the upload section", async ({ page }) => {
    await page.goto("/");
    const uploadRoot = page.locator("#upload");
    await uploadRoot.scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("heading", { name: /^upload your ultrasound$/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      uploadRoot.getByRole("button", { name: /upload your 4d ultrasound image/i }),
    ).toBeVisible({
      timeout: 15_000,
    });
    await expect(uploadRoot.getByLabel(/email address/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
