import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('API health check', async ({ request }) => {
    const baseURL = process.env.BASE_URL || 'https://beta.bagadmenru.bzh';
    const apiURL = baseURL.replace('://', '://api.');

    const res = await request.get(`${apiURL}/api/v1/health`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe('healthy');
  });

  test('Frontend loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Bagad Men Ru/);
  });

  test('Login page accessible', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveTitle(/Bagad Men Ru/);
    await expect(page.locator('h1')).toHaveText('Connexion');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connexion' })).toBeVisible();
  });
});
