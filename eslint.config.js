import pluginJs from "@eslint/js";
import pluginAstro from "eslint-plugin-astro";
import pluginBoundaries from "eslint-plugin-boundaries";
import pluginImport from "eslint-plugin-import";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: pluginImport,
      boundaries: pluginBoundaries,
    },
    rules: {
      // Code quality rules
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",

      // Import rules
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "error",

      // Complexity and maintainability
      complexity: ["warn", { max: 15 }],
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],

      // Best practices
      eqeqeq: ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-return-await": "error",
      "require-await": "warn",

      // Module boundary rules
      "boundaries/element-types": [
        "error",
        {
          default: "allow",
          rules: [
            {
              from: ["pages"],
              allow: ["layouts", "components", "config", "content", "utils"],
              disallow: ["styles"],
            },
            {
              from: ["layouts"],
              allow: ["components", "config", "styles", "utils"],
            },
            {
              from: ["components"],
              allow: ["components", "config", "styles", "utils"],
              disallow: ["pages", "layouts"],
            },
          ],
        },
      ],
      "boundaries/entry-point": [
        "error",
        {
          default: "allow",
          rules: [
            {
              target: ["pages"],
              allow: "**/*.astro",
            },
          ],
        },
      ],
    },
  },
  ...pluginAstro.configs.recommended,
  {
    files: ["**/*.astro"],
    processor: "astro/client-side-ts",
  },
  // Test files configuration
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        vi: "readonly",
      },
    },
  },
  // Ignore patterns
  {
    ignores: [
      "build/**",
      "dist/**",
      "node_modules/**",
      ".astro/**",
      ".astro.bak-*/**",
      "public/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".reports/**",
      "*.d.ts",
    ],
  },
];
