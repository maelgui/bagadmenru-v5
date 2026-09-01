import { test, expect } from '@playwright/test';
import { E2E_USER } from './helpers/constants';
import { loginViaUI } from './helpers/auth';

test.describe('Home Page', () => {
  test('home page renders after login', async ({ page }) => {
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);

    // After login, user should be redirected to home
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');

    // Home page should render without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation is accessible after login', async ({ page }) => {
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);

    await page.waitForLoadState('networkidle');

    // The desktop primary navigation should be visible with main links
    const nav = page.getByRole('navigation', { name: 'Navigation principale' }).first();
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Accueil' })).toBeVisible();
  });
});
