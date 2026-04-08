import { describe, it, expect } from "vitest";

import {
  CATEGORY_ORDER,
  CATEGORY_META,
  categoryMatches,
  getCategoryLabel,
  getCategoryRouteSlugs,
} from "./categories";

describe("CATEGORY_ORDER", () => {
  it("should be a readonly array of category slugs", () => {
    expect(Array.isArray(CATEGORY_ORDER)).toBe(true);
    expect(CATEGORY_ORDER.length).toBeGreaterThan(0);
  });

  it("should contain expected categories in order", () => {
    expect(CATEGORY_ORDER).toContain("infrastructure");
    expect(CATEGORY_ORDER).toContain("automation");
    expect(CATEGORY_ORDER).toContain("ai");
    expect(CATEGORY_ORDER).toContain("cloud");
    expect(CATEGORY_ORDER).toContain("local-ai");
    expect(CATEGORY_ORDER).toContain("kotlin");
    expect(CATEGORY_ORDER).toContain("snippets");
    expect(CATEGORY_ORDER).toContain("career");
  });

  it("should have infrastructure as first category", () => {
    expect(CATEGORY_ORDER[0]).toBe("infrastructure");
  });
});

describe("CATEGORY_META", () => {
  it("should have metadata for all categories in CATEGORY_ORDER", () => {
    CATEGORY_ORDER.forEach((slug) => {
      expect(CATEGORY_META[slug]).toBeDefined();
      expect(CATEGORY_META[slug].label).toBeDefined();
      expect(CATEGORY_META[slug].description).toBeDefined();
    });
  });

  it("should have non-empty labels and descriptions", () => {
    Object.values(CATEGORY_META).forEach((meta) => {
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
    });
  });

  it("should have matching keys for all category slugs", () => {
    const metaKeys = Object.keys(CATEGORY_META);
    CATEGORY_ORDER.forEach((slug) => {
      expect(metaKeys).toContain(slug);
    });
  });
});

describe("getCategoryLabel", () => {
  it("returns the label for a valid category slug", () => {
    expect(getCategoryLabel("infrastructure")).toBe("Infrastructure");
    expect(getCategoryLabel("automation")).toBe("Automation");
    expect(getCategoryLabel("ai")).toBe("AI");
    expect(getCategoryLabel("cloud")).toBe("Cloud");
    expect(getCategoryLabel("local-ai")).toBe("Local AI");
    expect(getCategoryLabel("kotlin")).toBe("Kotlin");
    expect(getCategoryLabel("snippets")).toBe("Snippets");
    expect(getCategoryLabel("career")).toBe("Career");
  });

  it("returns the slug as-is for unknown categories", () => {
    expect(getCategoryLabel("unknown-category")).toBe("unknown-category");
    expect(getCategoryLabel("random")).toBe("random");
  });

  it("handles empty string gracefully", () => {
    expect(getCategoryLabel("")).toBe("");
  });

  it("is case-sensitive for unknown slugs", () => {
    expect(getCategoryLabel("Infrastructure")).toBe("Infrastructure");
    expect(getCategoryLabel("INFRASTRUCTURE")).toBe("INFRASTRUCTURE");
  });
});

describe("getCategoryRouteSlugs", () => {
  it("returns ai plus local-ai for the AI route", () => {
    expect(getCategoryRouteSlugs("ai")).toEqual(["ai", "local-ai"]);
  });

  it("returns the category itself for non-aggregated routes", () => {
    expect(getCategoryRouteSlugs("local-ai")).toEqual(["local-ai"]);
    expect(getCategoryRouteSlugs("automation")).toEqual(["automation"]);
  });

  it("falls back to the raw slug for unknown routes", () => {
    expect(getCategoryRouteSlugs("unknown")).toEqual(["unknown"]);
  });
});

describe("categoryMatches", () => {
  it("treats local-ai posts as part of the AI route", () => {
    expect(categoryMatches(["local-ai"], "ai")).toBe(true);
    expect(categoryMatches(["ai"], "ai")).toBe(true);
  });

  it("does not over-match unrelated categories", () => {
    expect(categoryMatches(["cloud"], "ai")).toBe(false);
    expect(categoryMatches(["ai"], "local-ai")).toBe(false);
  });
});
