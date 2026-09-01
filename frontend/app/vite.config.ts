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
      '/api': 'https://api.beta.bagadmenru.bzh',
      '/docs': 'http://backend:8000',
      '/openapi.json': 'http://backend:8000',
    },
  },

  build: {
    sourcemap: true
  }
})
