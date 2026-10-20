import { expect, test } from '@playwright/test';
import { loginViaUI } from './helpers/auth';
import { E2E_ADMIN } from './helpers/constants';

test.describe('File versions', () => {
  test('re-uploading a file keeps the previous version downloadable from the details dialog', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await page.goto('/files');
    await page.waitForLoadState('networkidle');

    const name = `e2e-versions-${Date.now()}.txt`;
    const folder = page.getByRole('region', { name: 'Contenu du dossier' });

    await page.setInputFiles('input[type="file"]', {
      name,
      mimeType: 'text/plain',
      buffer: Buffer.from('first content'),
    });
    await expect(folder.getByRole('link', { name })).toBeVisible({ timeout: 15_000 });

    await page.setInputFiles('input[type="file"]', {
      name,
      mimeType: 'text/plain',
      buffer: Buffer.from('second, longer content'),
    });
    await page.getByRole('button', { name: 'Écraser' }).click();
    await expect(
      page.getByText(/fichier\(s\) envoyé\(s\) avec succès/i),
    ).toBeVisible({ timeout: 15_000 });

    await folder.getByRole('button', { name: `Actions pour ${name}` }).click();
    await page.getByRole('menuitem', { name: 'Détails...' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Versions', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Actuelle', { exact: true })).toBeVisible();

    const href = await dialog.getByRole('link', { name: 'Télécharger la version 1' }).getAttribute('href');
    expect(href).toBeTruthy();
    const response = await page.request.get(href!, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    const location = decodeURIComponent(response.headers().location);
    expect(location).toContain(`-v1?`);
    expect(location).toContain(`attachment; filename="${name.replace(/\.txt$/, ' (v1).txt')}"`);
  });
});
