import { type Page, type APIRequestContext, request } from '@playwright/test';
import { API_URL } from './constants';

/**
 * Login via the API and return the access_token.
 * Useful for setting up authenticated API contexts.
 */
export async function loginViaAPI(
  email: string,
  password: string,
  baseURL?: string
): Promise<string> {
  const url = baseURL || API_URL;
  const ctx = await request.newContext({ baseURL: url });

  const res = await ctx.post('/api/v1/auth/login', {
    data: { type: 'password', email, password },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status()} ${body}`);
  }

  const token = await res.json();
  await ctx.dispose();
  return token.access_token;
}

/**
 * Login via the UI (browser). Navigates to login page, fills form, submits.
 * Waits for redirect away from /auth/login.
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/auth/login');

  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation away from login page
  await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
    timeout: 10_000,
  });
}

/**
 * Create an authenticated API request context with the access_token cookie set.
 */
export async function createAuthenticatedContext(
  email: string,
  password: string,
  baseURL?: string
): Promise<APIRequestContext> {
  const url = baseURL || API_URL;
  const token = await loginViaAPI(email, password, url);

  return request.newContext({
    baseURL: url,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}
