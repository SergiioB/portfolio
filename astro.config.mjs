import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://SergiioB.github.io',
  base: '/portfolio',
  output: 'static',
  integrations: [],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
