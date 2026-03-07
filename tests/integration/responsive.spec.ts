import { test, expect } from "@playwright/test";

test.describe("Responsive Design", () => {
  test("should display correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Check content is visible
    const main = page.locator("main").first();
    await expect(main).toBeVisible();
  });

  test("should display correctly on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    const main = page.locator("main").first();
    await expect(main).toBeVisible();
  });

  test("should display correctly on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const main = page.locator("main").first();
    await expect(main).toBeVisible();
  });
});

test.describe("Static Pages", () => {
  test("about page should load", async ({ page }) => {
    const response = await page.goto("/about/");
    expect(response?.status()).toBe(200);

    const main = page.locator("main").first();
    await expect(main).toBeVisible();
  });

  test("archive page should load", async ({ page }) => {
    const response = await page.goto("/archive/");
    expect(response?.status()).toBe(200);

    const main = page.locator("main").first();
    await expect(main).toBeVisible();
  });
});
