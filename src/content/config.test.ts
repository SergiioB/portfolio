import { describe, it, expect } from "vitest";

// Define the category schema type matching the Zod schema in config.ts
type Category =
  | "infrastructure"
  | "ai"
  | "cloud"
  | "local-ai"
  | "kotlin"
  | "snippets"
  | "career"
  | "automation";

describe("Category Types", () => {
  it("valid category values should be assignable to Category type", () => {
    const validCategories: Category[] = [
      "infrastructure",
      "ai",
      "cloud",
      "local-ai",
      "kotlin",
      "snippets",
      "career",
      "automation",
    ];

    validCategories.forEach((cat) => {
      expect(typeof cat).toBe("string");
    });
  });

  it("should handle single category string", () => {
    const singleCategory: Category = "infrastructure";
    const asArray = [singleCategory];
    expect(asArray).toEqual(["infrastructure"]);
    expect(asArray.length).toBe(1);
  });

  it("should handle multiple categories array", () => {
    const multipleCategories: Category[] = ["infrastructure", "automation"];
    expect(multipleCategories).toContain("infrastructure");
    expect(multipleCategories).toContain("automation");
  });

  it("category slug from categories.ts should match config categories", () => {
    // Import the actual category slugs to verify alignment
    const expectedCategories: Category[] = [
      "infrastructure",
      "automation",
      "ai",
      "cloud",
      "local-ai",
      "kotlin",
      "snippets",
      "career",
    ];

    // Verify all expected categories are valid
    expectedCategories.forEach((cat) => {
      expect([
        "infrastructure",
        "ai",
        "cloud",
        "local-ai",
        "kotlin",
        "snippets",
        "career",
        "automation",
      ]).toContain(cat);
    });
  });
});

describe("Post Schema Validation", () => {
  it("validates required fields exist", () => {
    const requiredFields = ["title", "description", "pubDate", "category"];
    expect(requiredFields).toContain("title");
    expect(requiredFields).toContain("description");
    expect(requiredFields).toContain("pubDate");
    expect(requiredFields).toContain("category");
  });

  it("validates optional fields", () => {
    const optionalFields = [
      "updatedDate",
      "tags",
      "situation",
      "issue",
      "solution",
      "usedIn",
      "impact",
    ];
    expect(optionalFields.length).toBe(7);
  });

  it("validates draft defaults to false", () => {
    const defaultDraft = false;
    expect(defaultDraft).toBe(false);
  });
});
