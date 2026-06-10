import { test, expect } from "@playwright/test";

test.describe("Blog Posts", () => {
  test("posts should have proper structure", async ({ page }) => {
    // Navigate to a category page first
    await page.goto("/infrastructure/");

    // Look for post links
    const postLinks = page.locator("a[href^='/posts/']");

    // Check if any posts exist
    const count = await postLinks.count();

    if (count > 0) {
      // Click the first post
      await postLinks.first().click();

      // Wait for navigation
      await page.waitForURL(/\/posts\//);

      // Check post page has expected elements
      const article = page.locator("article").first();
      await expect(article).toBeVisible();

      // Check for post title
      const title = page.locator("h1").first();
      await expect(title).toBeVisible();
    }
  });

  test("post pages should have reading time indicator", async ({ page }) => {
    await page.goto("/infrastructure/");

    const postLinks = page.locator("a[href^='/posts/']");
    const count = await postLinks.count();

    if (count > 0) {
      await postLinks.first().click();
      await page.waitForURL(/\/posts\//);

      // Check for reading time or meta info
      const meta = page.locator("time, [data-reading-time]").first();
      await expect(meta).toBeVisible();
    }
  });
});
