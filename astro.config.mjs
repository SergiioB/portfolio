import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://sergiiob.dev",
  output: "static",
  outDir: "build",
  integrations: [],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },
});
