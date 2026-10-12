import { expect, test } from '@playwright/test';
import { loginViaUI } from './helpers/auth';
import { E2E_ADMIN } from './helpers/constants';

test.describe('File move', () => {
  test('admin moves a file into a folder through the Files page UI', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);

    const stamp = Date.now();
    const destFolder = `e2e-move-dest-${stamp}`;
    const fileName = `e2e-move-file-${stamp}.txt`;

    await page.goto('/files');
    await page.waitForLoadState('networkidle');

    // The folder listing is a distinct region from the "Suggestions" rail,
    // which can legitimately keep showing a recently-uploaded file across the
    // whole tree. Scope move assertions to the folder listing itself.
    const folder = page.getByRole('region', { name: 'Contenu du dossier' });

    // Create the destination folder through the real UI dialog.
    await page.getByRole('button', { name: /Créer un dossier/i }).click();
    await page.getByLabel('Nom du dossier').fill(destFolder);
    await page.getByRole('button', { name: 'Créer', exact: true }).click();
    await expect(folder.getByRole('link', { name: destFolder })).toBeVisible();

    // Upload a file into root; this is the item we will move.
    await page.setInputFiles('input[type="file"]', {
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('bagad men ru e2e move'),
    });
    await expect(folder.getByRole('link', { name: fileName })).toBeVisible({ timeout: 15_000 });

    // Open the file's action menu and start a move. Driving the dialog here
    // means the move request goes through the generated client exactly as a
    // user's would, not a fabricated API call.
    await folder.getByRole('button', { name: `Actions pour ${fileName}` }).click();
    await page.getByRole('menuitem', { name: 'Déplacer...' }).click();

    // Navigate into the destination folder inside the move dialog, then confirm.
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: destFolder }).click();
    await dialog.getByRole('button', { name: /Déplacer ici/i }).click();

    // Success toast proves the move round-tripped, and the file no longer shows
    // in the root folder listing.
    await expect(page.getByText(new RegExp(`« ${fileName} » déplacé`))).toBeVisible({ timeout: 15_000 });
    await expect(folder.getByRole('link', { name: fileName })).toBeHidden();

    // The file is now inside the destination folder.
    await folder.getByRole('link', { name: destFolder }).click();
    await expect(folder.getByRole('link', { name: fileName })).toBeVisible();
  });
});
