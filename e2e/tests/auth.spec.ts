import { test, expect } from '@playwright/test';

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

  test('API returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/v1/profiles/me');
    expect(res.status()).toBe(401);
  });
});
