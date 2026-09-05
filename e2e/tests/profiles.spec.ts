import { expect, request, test, type APIRequestContext } from '@playwright/test';
import { createAuthenticatedContext, loginViaUI } from './helpers/auth';
import { API_URL, E2E_ADMIN, E2E_USER } from './helpers/constants';

test.describe('Profiles', () => {
  let adminCtx: APIRequestContext;
  let userCtx: APIRequestContext;

  test.beforeAll(async () => {
    adminCtx = await createAuthenticatedContext(E2E_ADMIN.email, E2E_ADMIN.password);
    userCtx = await createAuthenticatedContext(E2E_USER.email, E2E_USER.password);
  });

  test.afterAll(async () => {
    await adminCtx.dispose();
    await userCtx.dispose();
  });

  test('should return 401 without auth', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/profiles/');
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('user can get own profile', async () => {
    const res = await userCtx.get('/api/v1/profiles/me');
    expect(res.ok()).toBeTruthy();

    const profile = await res.json();
    expect(profile).toHaveProperty('email', E2E_USER.email);
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('first_name');
    expect(profile).toHaveProperty('last_name');
  });

  test('user can list profiles', async () => {
    const res = await userCtx.get('/api/v1/profiles/');
    expect(res.ok()).toBeTruthy();

    const profiles = await res.json();
    expect(Array.isArray(profiles)).toBeTruthy();
    expect(profiles.length).toBeGreaterThan(0);

    // Each profile should have basic fields
    const first = profiles[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('first_name');
    expect(first).toHaveProperty('last_name');
  });

  test('admin can list profiles', async () => {
    const res = await adminCtx.get('/api/v1/profiles/');
    expect(res.ok()).toBeTruthy();

    const profiles = await res.json();
    expect(Array.isArray(profiles)).toBeTruthy();
    expect(profiles.length).toBeGreaterThan(0);
  });

  test('user can get rankings', async () => {
    const res = await userCtx.get('/api/v1/stats/rankings');
    expect(res.ok()).toBeTruthy();

    const rankings = await res.json();
    expect(rankings).toBeDefined();
  });
});

test.describe('Profiles UI', () => {
  test('profiles list page renders after login', async ({ page }) => {
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Should see members list header
    await expect(page.getByRole('heading', { name: 'Membres' })).toBeVisible();
  });

  test('my profile page renders with user info', async ({ page }) => {
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);

    await page.goto('/profile/me');
    await page.waitForLoadState('networkidle');

    // Should see "Profil" heading
    await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();

    // Should display the user's name (in the h4 subtitle)
    await expect(page.locator('h1').filter({ hasText: `${E2E_USER.firstName} ${E2E_USER.lastName}` })).toBeVisible();

    // Should have the "Paramètres" action button (links to /profile/settings)
    await expect(page.getByRole('button', { name: 'Paramètres' })).toBeVisible();
  });
});
