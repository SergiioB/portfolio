import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,js}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: ".reports/coverage",
      thresholds: {
        branches: 60,
        functions: 60,
        lines: 80,
        statements: 80,
      },
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/types.ts",
        "**/*.test.*",
        "**/*.spec.*",
      ],
    },
  },
});
