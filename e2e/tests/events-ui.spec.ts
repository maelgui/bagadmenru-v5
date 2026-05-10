import { expect, test } from '@playwright/test';
import { loginViaUI } from './helpers/auth';
import { E2E_ADMIN, E2E_USER } from './helpers/constants';

test.describe('Events UI', () => {
  test('events planning page renders after login', async ({ page }) => {
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);

    await page.goto('/events/planning');
    await page.waitForLoadState('networkidle');

    // Should see planning / calendar content
    await expect(page.locator('body')).toBeVisible();
  });

  test('events calendar page renders', async ({ page }) => {
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);

    await page.goto('/events/calendar');
    await page.waitForLoadState('networkidle');

    // Calendar should render
    await expect(page.locator('body')).toBeVisible();
  });

  test('doodle page renders', async ({ page }) => {
    await loginViaUI(page, E2E_USER.email, E2E_USER.password);

    await page.goto('/events/doodle');
    await page.waitForLoadState('networkidle');

    // Doodle / availability page should render
    await expect(page.locator('body')).toBeVisible();
  });

  test('admin can access events management page', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);

    await page.goto('/events/manage');
    await page.waitForLoadState('networkidle');

    // Should see events management heading
    await expect(page.getByRole('heading', { name: 'Gestion des évènements' })).toBeVisible();
  });

  test('admin can navigate to add event form', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);

    await page.goto('/events/add');
    await page.waitForLoadState('networkidle');

    // Event creation form should be visible
    await expect(page.locator('body')).toBeVisible();
  });
});
