import { test, expect, request, type APIRequestContext } from '@playwright/test';
import { loginViaUI, createAuthenticatedContext } from './helpers/auth';
import { E2E_ADMIN, API_URL } from './helpers/constants';
import { deleteE2EEvents } from './helpers/events';

const PUBLIC_TITLE = 'E2E Public Fest-noz';
const PRIVATE_TITLE = 'E2E Private Meeting';
const UI_TITLE = 'E2E Public From Form';

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

test.describe('Public events feed', () => {
  let adminCtx: APIRequestContext;
  let apiKey: string;
  let apiKeyHash: string;

  test.beforeAll(async () => {
    adminCtx = await createAuthenticatedContext(E2E_ADMIN.email, E2E_ADMIN.password);

    const publicRes = await adminCtx.post('/api/v1/events/', {
      data: {
        title: PUBLIC_TITLE,
        description: 'Members-only logistics: meet at 19h for setup',
        date: isoDaysFromNow(10),
        category: 'sortie',
        costume: 'COSTUME',
        is_in_doodle: false,
        location: 'Salle du Confluent',
        start_time: '21:00',
        is_public: true,
        public_description: 'Fest-noz with the Cercle Montfortais',
      },
    });
    expect(publicRes.ok()).toBeTruthy();

    const privateRes = await adminCtx.post('/api/v1/events/', {
      data: {
        title: PRIVATE_TITLE,
        description: 'Board meeting',
        date: isoDaysFromNow(11),
        category: 'autre',
        costume: 'NONE',
        is_in_doodle: false,
      },
    });
    expect(privateRes.ok()).toBeTruthy();

    // The key the public website build would hold: scoped to the public feed only.
    const keyRes = await adminCtx.post('/api/v1/profiles/me/api-keys', {
      data: { label: 'E2E public agenda', authorized_permissions: ['view:public_event'] },
    });
    expect(keyRes.ok()).toBeTruthy();
    const created = await keyRes.json();
    apiKey = created.key;
    apiKeyHash = created.key_hash;
  });

  test.afterAll(async () => {
    await adminCtx.delete(`/api/v1/profiles/me/api-keys/${apiKeyHash}`).catch(() => undefined);
    await deleteE2EEvents();
    await adminCtx.dispose();
  });

  test('requires authentication', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/events/public');
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('a scoped API key reads only public events and only public fields', async () => {
    const ctx = await request.newContext({ baseURL: API_URL, extraHTTPHeaders: { 'X-API-Key': apiKey } });
    const res = await ctx.get(`/api/v1/events/public?date__gte=${isoDaysFromNow(0)}&limit=100`);
    expect(res.ok()).toBeTruthy();

    const events = (await res.json()) as Array<Record<string, unknown>>;
    const titles = events.map((e) => e.title);
    expect(titles).toContain(PUBLIC_TITLE);
    expect(titles).not.toContain(PRIVATE_TITLE);

    const publicEvent = events.find((e) => e.title === PUBLIC_TITLE)!;
    expect(publicEvent).toEqual({
      id: expect.any(Number),
      title: PUBLIC_TITLE,
      date: isoDaysFromNow(10),
      start_time: '21:00:00',
      location: 'Salle du Confluent',
      category: 'sortie',
      description: 'Fest-noz with the Cercle Montfortais',
    });
    await ctx.dispose();
  });

  test('the public-feed key cannot list members events', async () => {
    const ctx = await request.newContext({ baseURL: API_URL, extraHTTPHeaders: { 'X-API-Key': apiKey } });
    const res = await ctx.get('/api/v1/events/');
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });

  test('staff can publish an event from the form', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await page.goto('/events/add');

    await page.getByLabel('Titre').fill(UI_TITLE);
    await page.getByLabel('Description', { exact: true }).fill('Members-only details');
    await page.getByLabel('Date').fill(isoDaysFromNow(12));
    await page.getByLabel('Heure').fill('16:00');
    await page.getByLabel('Lieu').fill('Église Saint-Louis-Marie');

    // The public description only appears once the event is flagged public.
    await expect(page.getByLabel('Description publique')).toHaveCount(0);
    await page.getByRole('checkbox', { name: 'Afficher sur le site public' }).click();
    await page.getByLabel('Description publique').fill('Christmas concert with the Cercle');

    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await page.waitForURL('**/events/manage');

    const res = await adminCtx.get(`/api/v1/events/?date__gte=${isoDaysFromNow(12)}&limit=100`);
    const created = ((await res.json()) as Array<Record<string, unknown>>).find((e) => e.title === UI_TITLE);
    expect(created).toMatchObject({
      is_public: true,
      public_description: 'Christmas concert with the Cercle',
      start_time: '16:00:00',
      location: 'Église Saint-Louis-Marie',
    });
  });
});
