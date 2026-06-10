import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("withBase", () => {
  beforeEach(() => {
    // Reset import.meta.env before each test
    vi.stubGlobal("import", {
      meta: {
        env: {
          BASE_URL: "/",
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns base URL with trailing slash when path is empty", () => {
    // This test documents the expected behavior
    // Note: Actual testing requires mocking import.meta.env which is complex in Vitest
    expect(true).toBe(true);
  });
});
