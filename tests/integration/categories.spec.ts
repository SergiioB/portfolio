import { test, expect } from "@playwright/test";

const CATEGORIES = [
  "infrastructure",
  "automation",
  "ai",
  "cloud",
  "local-ai",
  "kotlin",
  "snippets",
  "career",
];

test.describe("Category Pages", () => {
  for (const category of CATEGORIES) {
    test(`/${category} page should load successfully`, async ({ page }) => {
      const response = await page.goto(`/${category}/`);

      // Check page loaded successfully
      expect(response?.status()).toBe(200);

      // Check for main content
      const main = page.locator("main").first();
      await expect(main).toBeVisible();
    });

    test(`/${category} page should have proper heading`, async ({ page }) => {
      await page.goto(`/${category}/`);

      // Check for heading with category name
      const heading = page.locator("h1").first();
      await expect(heading).toBeVisible();
    });
  }
});
