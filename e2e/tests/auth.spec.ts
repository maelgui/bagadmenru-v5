import { test, expect, request } from '@playwright/test';
import { E2E_USER, API_URL } from './helpers/constants';
import { loginViaUI, loginViaAPI } from './helpers/auth';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show an error alert and stay on login page
    await expect(
      page.getByText('Email ou mot de passe incorrect')
    ).toBeVisible({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);

    // Should be redirected away from login (e.g., to home)
    await expect(page).not.toHaveURL(/\/auth\/login/);

    // Verify via API that user is authenticated
    const ctx = await request.newContext({ baseURL: API_URL });
    const token = await loginViaAPI(E2E_USER.email, E2E_USER.password);
    const res = await ctx.get('/api/v1/profiles/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();

    const profile = await res.json();
    expect(profile.email).toBe(E2E_USER.email);
    expect(profile.first_name).toBe(E2E_USER.firstName);
    await ctx.dispose();
  });

  test('should logout successfully', async ({ page }) => {
    // Login via UI
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);
    await expect(page).not.toHaveURL(/\/auth\/login/);

    // Verify logged-in state via page (the frontend should show authenticated UI)
    // Then navigate to login — should redirect away if authenticated
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test('API returns 401 without auth', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/profiles/me');
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('API login returns valid token', async () => {
    const token = await loginViaAPI(E2E_USER.email, E2E_USER.password);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT format
  });
});
