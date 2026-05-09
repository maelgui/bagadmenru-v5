import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests — lightweight checks against a deployed environment.
 *
 * Usage:
 *   npm run test:smoke           → runs against prod (default)
 *   npm run test:smoke:beta      → runs against beta
 */
export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,

  use: {
    baseURL: process.env.BASE_URL || 'https://prod.bagadmenru.bzh',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'smoke',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
