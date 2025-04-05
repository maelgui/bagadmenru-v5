import { sentryVitePlugin } from "@sentry/vite-plugin";
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), sentryVitePlugin({
    org: "bagadmenru",
    project: "bbe2-frontend"
  })],

  server: {
    proxy: {
      '/api': 'http://backend:8000',
      '/docs': 'http://backend:8000',
      '/openapi.json': 'http://backend:8000',
    },
  },

  build: {
    sourcemap: true
  }
})
