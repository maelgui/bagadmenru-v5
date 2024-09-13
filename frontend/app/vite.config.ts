import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { keycloakify } from "keycloakify/vite-plugin";
import { defineConfig } from 'vite';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), keycloakify(), basicSsl({
    /** name of certification */
    name: 'test',
    /** custom trust domains */
    domains: ['*.custom.com'],
    /** custom certification directory */
    certDir: '/Users/.../.devServer/cert'
  })],
  server: {
    proxy: {
      '/api': 'http://backend:8000',
      '/ory': {
        target: 'http://kratos:4433',
        rewrite: (path) => path.replace(/^\/ory/, ''),
      }
    },
  },
})
