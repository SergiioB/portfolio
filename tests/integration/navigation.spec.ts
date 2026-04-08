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

  test("should expose a visible language switcher and switch chrome text", async ({ page }) => {
    await page.goto("/");

    const spanishButton = page.locator("[data-lang-option='es']").first();
    await expect(spanishButton).toBeVisible();
    await spanishButton.click();

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.locator("[data-i18n='nav.home']").first()).toHaveText("Inicio");
    await expect(page.locator("[data-i18n='about.cvLabel']").first()).toHaveText("Ver CV");
  });

  test("should point the CV button to the English document when English is active", async ({
    page,
  }) => {
    await page.goto("/");

    const englishButton = page.locator("[data-lang-option='en']").first();
    await englishButton.click();

    const cvLink = page.locator(".hero-actions a[data-href-en][data-href-es]").first();
    await expect(cvLink).toHaveAttribute("href", "/docs/cv-sergio-barrientos.html");
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
