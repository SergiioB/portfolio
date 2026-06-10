import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should display the homepage with correct title", async ({ page }) => {
    await page.goto("/");

    // Check page title contains expected text
    await expect(page).toHaveTitle(/Sergio|Portfolio/);
  });

  test("should display navigation elements", async ({ page }) => {
    await page.goto("/");

    // Check for main navigation or header (visible or in DOM)
    const header = page.locator("header").first();
    await expect(header).toBeAttached();
  });

  test("should display main content area", async ({ page }) => {
    await page.goto("/");

    // Check main content exists
    const main = page.locator("main").first();
    await expect(main).toBeVisible();
  });

  test("should have working links to category pages", async ({ page }) => {
    await page.goto("/");

    // Check for category links
    const links = page.locator("a[href^='/']");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });
});
