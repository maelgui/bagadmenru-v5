import react from '@vitejs/plugin-react';
import { keycloakify } from "keycloakify/vite-plugin";
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), keycloakify(),],
  server: {
    proxy: {
      '/api': 'http://backend:8000',
    },
  },
})
