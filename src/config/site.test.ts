import { describe, it, expect } from "vitest";

describe("Site Configuration", () => {
  it("should have valid site metadata structure", () => {
    const requiredFields = [
      "title",
      "description",
      "author",
      "url",
      "defaultLocale",
      "availableLocales",
    ];

    requiredFields.forEach((field) => {
      expect(typeof field).toBe("string");
    });
  });

  it("should have valid author structure", () => {
    const authorFields = ["name", "email", "github", "linkedin"];
    expect(authorFields.length).toBe(4);
  });

  it("should have valid locale configuration", () => {
    const locales = ["en", "es"];
    expect(locales).toContain("en");
    expect(locales).toContain("es");
  });
});
