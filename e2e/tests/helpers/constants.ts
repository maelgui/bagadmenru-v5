/**
 * E2E test credentials — must match backend/bbe2/cli.py seed-e2e command.
 */
export const E2E_USER = {
  email: 'e2e@bagadmenru.bzh',
  password: 'E2eTest1234!',
  firstName: 'E2E',
  lastName: 'User',
};

export const E2E_ADMIN = {
  email: 'e2e-admin@bagadmenru.bzh',
  password: 'E2eAdmin1234!',
  firstName: 'E2E',
  lastName: 'Admin',
};

/**
 * API base URL — separate from frontend BASE_URL.
 * Locally the API lives on localhost:8888 (docker-compose maps 8888→8000).
 * In beta/prod, the API lives on a separate subdomain (api.beta.bagadmenru.bzh).
 */
export const API_URL = process.env.API_URL || 'http://localhost:8888';
