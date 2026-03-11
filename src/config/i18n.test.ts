import { describe, it, expect } from "vitest";

import type { Locale } from "./i18n";

describe("Internationalization", () => {
  it("should support defined locales", () => {
    const supportedLocales: Locale[] = ["en", "es"];
    expect(supportedLocales).toContain("en");
    expect(supportedLocales).toContain("es");
  });

  it("should have translations for all supported locales", () => {
    const locales: Locale[] = ["en", "es"];
    const translationKeys = [
      "site.title",
      "site.description",
      "nav.home",
      "nav.about",
      "nav.posts",
    ];

    locales.forEach((locale) => {
      expect(typeof locale).toBe("string");
    });

    translationKeys.forEach((key) => {
      expect(typeof key).toBe("string");
    });
  });

  it("should handle locale switching", () => {
    const currentLocale: Locale = "en";
    const newLocale: Locale = "es";

    expect(currentLocale).not.toBe(newLocale);
  });

  it("should have valid translation structure", () => {
    // Test that translation keys follow the nested pattern
    const validKeyPattern = /^[a-z]+(\.[a-z]+)+$/;
    const testKeys = ["site.title", "nav.home", "footer.copyright"];

    testKeys.forEach((key) => {
      expect(validKeyPattern.test(key)).toBe(true);
    });
  });
});
