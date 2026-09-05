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
 * API base URL — separate from frontend BASE_URL.
 * Locally the API lives on localhost:8888 (docker-compose maps 8888→8000).
 * In beta/prod, the API lives on a separate subdomain (api.beta.bagadmenru.bzh).
 */
export const API_URL = process.env.API_URL || 'http://localhost:8888';

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
