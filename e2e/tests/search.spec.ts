import { expect, test, type Page } from '@playwright/test';
import { createAuthenticatedContext, loginViaUI } from './helpers/auth';
import { E2E_ADMIN } from './helpers/constants';
import { deleteE2EEvents, E2E_EVENT_PREFIX } from './helpers/events';

const SEARCH_PLACEHOLDER = 'Pages, évènements, membres, fichiers…';

async function openSearch(page: Page) {
  await page.getByRole('button', { name: 'Rechercher' }).first().click();
  const input = page.getByPlaceholder(SEARCH_PLACEHOLDER);
  await expect(input).toBeVisible();
  return input;
}

test.describe('Global search', () => {
  const stamp = Date.now();
  const eventTitle = `${E2E_EVENT_PREFIX}Fête de Loudéac ${stamp}`;
  const fileName = `e2e-search-${stamp}.txt`;
  let eventId: number;
  let folderId: number;

  test.beforeAll(async () => {
    const ctx = await createAuthenticatedContext(E2E_ADMIN.email, E2E_ADMIN.password);
    const event = await ctx.post('/api/v1/events/', {
      data: {
        title: eventTitle, description: 'E2E search fixture', date: '2031-05-19', costume: 'NONE', category: 'sortie', is_in_doodle: true,
      },
    });
    expect(event.ok()).toBeTruthy();
    eventId = ((await event.json()) as { id: number }).id;

    const root = (await (await ctx.get('/api/v1/files/root')).json()) as { id: number };
    const folder = await ctx.post(`/api/v1/files/${root.id}`, { data: { name: `E2E Partitions ${stamp}` } });
    expect(folder.ok()).toBeTruthy();
    folderId = ((await folder.json()) as { id: number }).id;
    const upload = await ctx.post(`/api/v1/files/${folderId}/upload`, {
      multipart: { file: { name: fileName, mimeType: 'text/plain', buffer: Buffer.from('search me') } },
    });
    expect(upload.ok()).toBeTruthy();
    await ctx.dispose();
  });

  test.afterAll(async () => {
    const ctx = await createAuthenticatedContext(E2E_ADMIN.email, E2E_ADMIN.password);
    await ctx.delete(`/api/v1/files/${folderId}`).catch(() => undefined);
    await ctx.dispose();
    await deleteE2EEvents();
  });

  test('finds a file by an accent-insensitive name and shows its folder path', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);
    const input = await openSearch(page);
    await input.fill(`E2E-SEARCH-${stamp}`);

    const hit = page.getByRole('option', { name: new RegExp(fileName) });
    await expect(hit).toBeVisible();
    await expect(hit).toContainText(`Fichiers / E2E Partitions ${stamp}`);
  });

  test('opens the event page from a search hit', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);
    const input = await openSearch(page);
    await input.fill(`loudeac ${stamp}`);

    const hit = page.getByRole('option', { name: new RegExp(eventTitle) });
    await expect(hit).toBeVisible();
    await hit.click();

    await expect(page).toHaveURL(new RegExp(`/events/${eventId}$`));
    await expect(page.getByRole('heading', { name: eventTitle })).toBeVisible();
    await expect(page.getByText('Votre réponse')).toBeVisible();
  });

  test('offers pages and members, and the keyboard shortcut opens the palette', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await expect(page.getByRole('button', { name: 'Rechercher' }).first()).toBeVisible();
    await page.keyboard.press('ControlOrMeta+k');
    const input = page.getByPlaceholder(SEARCH_PLACEHOLDER);
    await expect(input).toBeVisible();

    await input.fill('trombi');
    await expect(page.getByRole('option', { name: 'Trombinoscope' })).toBeVisible();

    await input.fill('e2e admin');
    await expect(page.getByRole('option', { name: /E2E Admin/ })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(input).toBeHidden();
  });
});
