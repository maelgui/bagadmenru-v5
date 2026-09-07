/**
 * E2E test credentials — must match backend/bbe2/cli.py seed-e2e command.
 * In CI, these are passed via env vars from the deploy-beta job.
 * Locally, you can set E2E_USER_PASSWORD / E2E_ADMIN_PASSWORD env vars,
 * or use the defaults (which match docker-compose seed-e2e defaults).
 */

const DEFAULT_USER_PASSWORD = 'E2eTest1234!';
const DEFAULT_ADMIN_PASSWORD = 'E2eAdmin1234!';

export const E2E_USER = {
  email: process.env.E2E_USER_EMAIL || 'e2e@bagadmenru.bzh',
  password: process.env.E2E_USER_PASSWORD || DEFAULT_USER_PASSWORD,
  firstName: 'E2E',
  lastName: 'User',
};

export const E2E_ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'e2e-admin@bagadmenru.bzh',
  password: process.env.E2E_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
  firstName: 'E2E',
  lastName: 'Admin',
};

/**
 * Frontend origin under test. The API is served on the *same* origin under
 * `/api` (no separate api subdomain), so there is a single source of truth for
 * the host — no need to configure a frontend URL and an API URL separately.
 * Keep this in sync with `baseURL` in playwright.config.ts.
 */
export const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

/**
 * API base URL. Same-origin as the frontend by construction; kept as its own
 * export so API request contexts read intent-revealingly (`baseURL: API_URL`).
 * A `BASE_URL` override flows through automatically.
 */
export const API_URL = BASE_URL;

/**
 * HTTP header used to correlate a request, its response, and any email it
 * triggers. The backend accepts a well-formed client-supplied value and
 * echoes it back (and stamps it on outgoing emails); otherwise it generates
 * one. E2E tests set their own value so they can locate the exact email a
 * request produced, without matching on subject/body.
 *
 * Must match backend/bbe2/utils/correlation.py (CORRELATION_ID_HEADER).
 */
export const CORRELATION_ID_HEADER = 'X-Correlation-ID';
