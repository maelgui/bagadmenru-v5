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
  test('admin reaches the groups list in the admin area', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);

    // The legacy /groups URL redirects into the admin area.
    await page.goto('/groups');
    await page.waitForURL('**/admin/groups');

    await expect(page.getByRole('heading', { name: 'Administration' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('row', { name: /E2E Members/ })).toBeVisible();
  });

  test('regular member is sent home from the admin area', async ({ page }) => {
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);

    await page.goto('/admin/groups');
    await page.waitForURL((url) => url.pathname === '/');

    await expect(page.getByRole('heading', { name: 'Administration' })).toHaveCount(0);
  });

  test('member still opens a group page from a profile', async ({ page }) => {
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);

    const res = await page.request.get('/api/v1/groups/');
    const groups = (await res.json()) as Array<{ id: number; name: string }>;
    const group = groups.find((g) => g.name === 'E2E Members') ?? groups[0];

    await page.goto(`/groups/${group.id}`);
    await expect(page.getByRole('heading', { name: `Groupe ${group.name}` })).toBeVisible();
    // Non-admins get no path back to the admin list and cannot edit.
    await expect(page.getByRole('link', { name: 'Liste des membres' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Modifier' })).toHaveCount(0);
  });
});
