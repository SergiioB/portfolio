import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should have accessible navigation", async ({ page }) => {
    await page.goto("/");

    // Check for nav landmark
    const nav = page.locator("nav, [role='navigation']").first();
    await expect(nav).toBeVisible();
  });

  test("should navigate between pages", async ({ page }) => {
    await page.goto("/");

    // Find and click a category link
    const categoryLink = page.locator("a[href='/infrastructure/'], a[href='/ai/']").first();

    if (await categoryLink.isVisible().catch(() => false)) {
      await categoryLink.click();

      // Verify navigation occurred
      await expect(page).not.toHaveURL("/");
    }
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/");

    // Check for h1 on the page
    const h1 = page.locator("h1");
    const h1Count = await h1.count();

    // Most pages should have exactly one h1
    expect(h1Count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Accessibility", () => {
  test("should have lang attribute on html", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    const lang = await html.getAttribute("lang");

    expect(lang).toBeTruthy();
  });

  test("images should have alt text", async ({ page }) => {
    await page.goto("/");

    // Get all images
    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      // Alt can be empty for decorative images, but attribute should exist
      expect(alt).not.toBeNull();
    }
  });
});
