import { test, expect } from "@playwright/test";

test.describe("Marketing routes", () => {
  test("blog index loads and featured article opens", async ({ page }) => {
    await page.goto("/blog");
    await expect(page).toHaveURL(/\/blog\/?$/);
    await expect(page.getByRole("heading", { name: "BabyPeek Blog", level: 1 })).toBeVisible();
    await expect(page.getByTestId("blog-index-root")).toBeVisible();

    await page.getByRole("link", { name: /What Will My Baby Look Like/i }).first().click();
    await expect(page).toHaveURL(/\/blog\/what-will-my-baby-look-like/);
  });

  test("blog article slug loads directly (lazy chunk)", async ({ page }) => {
    await page.goto("/blog/how-ai-baby-portrait-technology-works");
    await expect(page).toHaveURL(/\/blog\/how-ai-baby-portrait-technology-works/);
    await expect(
      page.getByRole("heading", { name: /How AI Baby Portrait Technology Works \(2026 Guide\)/i, level: 1 }),
    ).toBeVisible();
  });

  test("pricing marketing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /Simple Pricing/i, level: 1 })).toBeVisible();
  });

  test("how-it-works marketing page loads", async ({ page }) => {
    await page.goto("/how-it-works");
    await expect(
      page.getByRole("heading", { name: /How BabyPeek Turns Your Ultrasound/i, level: 1 }),
    ).toBeVisible();
  });

  test("compare hub and a comparison article load", async ({ page }) => {
    await page.goto("/compare");
    await expect(page).toHaveURL(/\/compare\/?$/);
    await expect(
      page.getByRole("heading", { name: /Compare AI Baby Portrait Tools/i, level: 1 }),
    ).toBeVisible();

    await page.getByRole("link", { name: /AI Baby Generators 2026/i }).first().click();
    await expect(page).toHaveURL(/\/compare\/ai-baby-generators-2026/);
    await expect(page.getByRole("heading", { name: /AI Baby Generators/i, level: 1 })).toBeVisible();
  });

  test("for-clinics hub loads", async ({ page }) => {
    await page.goto("/for-clinics");
    await expect(page).toHaveURL(/\/for-clinics\/?$/);
    await expect(
      page.getByRole("heading", { name: /Add AI Baby Portraits to Your Ultrasound Services/i, level: 1 }),
    ).toBeVisible();
  });

  test("for-clinics security page loads", async ({ page }) => {
    await page.goto("/for-clinics/security");
    await expect(
      page.getByRole("heading", { name: /Security & Privacy for Clinical Use/i, level: 1 }),
    ).toBeVisible();
  });
});
