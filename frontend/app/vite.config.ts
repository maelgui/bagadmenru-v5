import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Only the dev-server port is parameterized (set from docker-compose), so
  // several checkouts can run side by side without clashing.
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_PORT ?? 5173);
  // On macOS the frontend runs inside a Finch/Docker Linux VM, and native
  // filesystem events (fsevents) don't cross the bind-mount boundary, so Vite's
  // HMR never fires. Enable chokidar polling in that case. Gated on an env var
  // so native (non-container) dev keeps event-based watching (cheaper on CPU).
  const usePolling = env.VITE_USE_POLLING === 'true';

  return {
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
      port,
      // See usePolling note above: required for HMR when running under Finch on
      // macOS. interval raised to 1000ms to bound CPU cost of polling.
      watch: usePolling
        ? { usePolling: true, interval: 1000 }
        : undefined,
      proxy: {
        // In the compose network these resolve to the service names; the stack
        // publishes only the frontend, so dev-tool UIs are reached here too.
        '/api': 'http://backend:8000',
        '/docs': 'http://backend:8000',
        '/openapi.json': 'http://backend:8000',
        // Mailpit runs with MP_WEBROOT=mailpit, so it serves under /mailpit and
        // emits prefix-aware URLs — no rewrite needed.
        '/mailpit': { target: 'http://mailpit:8025', changeOrigin: true },
        '/minio': {
          target: 'http://storage:9090',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/minio/, ''),
        },
      },
    },

    build: {
      sourcemap: true
    }
  };
})
