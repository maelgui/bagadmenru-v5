import { test, expect, request, type APIRequestContext } from '@playwright/test';
import { E2E_USER, E2E_ADMIN, API_URL } from './helpers/constants';
import { createAuthenticatedContext, loginViaUI } from './helpers/auth';

test.describe('Groups API', () => {
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
    const res = await ctx.get('/api/v1/groups/');
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('user can list groups', async () => {
    const res = await userCtx.get('/api/v1/groups/');
    expect(res.ok()).toBeTruthy();

    const groups = await res.json();
    expect(Array.isArray(groups)).toBeTruthy();
    expect(groups.length).toBeGreaterThan(0);

    // Each group should have basic fields
    const first = groups[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
  });

  test('admin can list groups', async () => {
    const res = await adminCtx.get('/api/v1/groups/');
    expect(res.ok()).toBeTruthy();

    const groups = await res.json();
    expect(Array.isArray(groups)).toBeTruthy();
    expect(groups.length).toBeGreaterThan(0);
  });
});

test.describe('Groups UI', () => {
  test('groups list page renders after login', async ({ page }) => {
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);

    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // Should see groups list header
    await expect(page.getByRole('heading', { name: 'Liste des groupes' })).toBeVisible();
  });
});
