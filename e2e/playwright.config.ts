import { defineConfig, devices } from '@playwright/test';

/**
 * Full E2E tests — run against Docker Compose stack (local) or beta (CI).
 *
 * Usage:
 *   npm test            → local: starts docker compose, runs against localhost
 *   npm run test:ci     → CI: runs against beta.bagadmenru.bzh with Mailpit port-forwarded
 */
export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/smoke/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html']] : 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start Docker Compose before tests (only locally — CI does it in a step)
  webServer: process.env.CI
    ? undefined
    : {
        command: 'docker compose up',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
