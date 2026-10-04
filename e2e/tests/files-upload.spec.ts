import { expect, test } from '@playwright/test';
import { loginViaUI } from './helpers/auth';
import { E2E_ADMIN } from './helpers/constants';

test.describe('File upload', () => {
  test('admin uploads a file through the Files page UI', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);

    await page.goto('/files');
    await page.waitForLoadState('networkidle');

    const name = `e2e-upload-${Date.now()}.txt`;

    // The upload input is visually hidden (sr-only) behind the "Ajouter un
    // fichier" label; setInputFiles drives the real browser file picker, so the
    // request goes through the generated client exactly as a user's would. This
    // is what catches the "[object File]" regression (client sending the file
    // as URLSearchParams instead of multipart FormData) — an API-level multipart
    // request would bypass that code path entirely.
    await page.setInputFiles('input[type="file"]', {
      name,
      mimeType: 'text/plain',
      buffer: Buffer.from('bagad men ru e2e upload'),
    });

    // Success toast proves the upload round-tripped (201), and the file shows
    // up in the listing.
    await expect(
      page.getByText(/fichier\(s\) envoyé\(s\) avec succès/i),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name })).toBeVisible();
  });
});
