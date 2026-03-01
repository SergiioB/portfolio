import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sergiiob.dev',
  output: 'static',
  integrations: [],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
