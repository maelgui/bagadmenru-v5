import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react(), sentryVitePlugin({
    org: "bagadmenru",
    project: "bbe2-frontend"
  })],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    proxy: {
      // Local dev: forward backend paths to the backend container. The API is
      // same-origin under /api (no api subdomain). For front-only dev against
      // beta, VITE_BBE2_API_URL points at the beta host instead of using this.
      '/api': 'http://backend:8000',
      '/docs': 'http://backend:8000',
      '/openapi.json': 'http://backend:8000',
    },
  },

  build: {
    sourcemap: true
  }
})
