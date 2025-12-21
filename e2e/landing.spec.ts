import { test, expect } from "@playwright/test"

test.describe("Landing Page", () => {
  test("loads successfully", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/BabyPeek/i)
  })

  test("displays hero section with headline", async ({ page }) => {
    await page.goto("/")

    // Check for main headline
    const headline = page.getByRole("heading", { level: 1 })
    await expect(headline).toBeVisible()
    await expect(headline).toHaveText(/meet your baby/i)
  })

  test("has CTA button", async ({ page }) => {
    await page.goto("/")

    // Check for at least one "Try it free" CTA button (there may be header + hero)
    const ctaButtons = page.getByRole("button", { name: /try it free/i })
    await expect(ctaButtons.first()).toBeVisible()
  })

  test("is mobile responsive", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto("/")

    // Page should still be usable
    const body = page.locator("body")
    await expect(body).toBeVisible()

    // No horizontal scroll
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    )
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    )
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // Allow 1px tolerance
  })

  test("CTA button has accessible touch target", async ({ page }) => {
    await page.goto("/")

    // Check the hero CTA button meets touch target requirements
    const ctaButton = page.getByRole("button", { name: /try it free/i }).first()
    await expect(ctaButton).toBeVisible()

    // Check minimum touch target size (48px per WCAG)
    const box = await ctaButton.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(48)
      expect(box.height).toBeGreaterThanOrEqual(48)
    }
  })
})
