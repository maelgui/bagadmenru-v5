import { test, expect, type APIRequestContext } from '@playwright/test';
import { E2E_USER, E2E_ADMIN } from './helpers/constants';
import { createAuthenticatedContext, loginViaUI } from './helpers/auth';

type AuditEvent = {
  id: number;
  kind: 'API_CALL' | 'PAGE_VIEW' | 'CLICK';
  name: string;
  path: string;
  method: string | null;
  status: number | null;
  actor: { id: string; email: string } | null;
};
type AuditPage = { items: AuditEvent[]; next_cursor: number | null };

async function fetchAudit(ctx: APIRequestContext, params: Record<string, string>): Promise<AuditEvent[]> {
  const res = await ctx.get('/api/v1/admin/audit', { params });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as AuditPage).items;
}

test.describe('Audit trail', () => {
  let adminCtx: APIRequestContext;

  test.beforeAll(async () => {
    adminCtx = await createAuthenticatedContext(E2E_ADMIN.email, E2E_ADMIN.password);
  });

  test.afterAll(async () => {
    await adminCtx.dispose();
  });

  test('only admins can read the journal', async () => {
    const userCtx = await createAuthenticatedContext(E2E_USER.email, E2E_USER.password);
    expect((await userCtx.get('/api/v1/admin/audit')).status()).toBe(403);
    await userCtx.dispose();
  });

  test('API calls are attributed to the member who made them', async () => {
    const userCtx = await createAuthenticatedContext(E2E_USER.email, E2E_USER.password);
    const marker = `audit-${Date.now()}`;
    // A 404 on a real route still records who asked for what.
    await userCtx.get(`/api/v1/events/${marker}`);
    await userCtx.dispose();

    const rows = await fetchAudit(adminCtx, { q: marker, kind: 'API_CALL' });
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('GET /api/v1/events/{event_id}');
    expect(rows[0].path).toBe(`/api/v1/events/${marker}`);
    expect(rows[0].actor?.email).toBe(E2E_USER.email);
    expect(rows[0].method).toBe('GET');
  });

  test('the browser reports page views and clicks through the real tracker', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);

    // The navbar link is a click and the navigation a page view. The tracker
    // batches and posts within a few seconds - wait for the real request that
    // carries this page view (an earlier batch may hold the login/home events).
    type Batch = { events: Array<{ kind: string; name: string; path: string }> };
    // The navbar links to /events/ (trailing slash); the route pattern keeps it.
    const EVENTS_PATH = /^\/events\/?$/;
    const ingest = page.waitForRequest(
      (req) => req.url().includes('/api/v1/audit/events')
        && req.method() === 'POST'
        && (req.postDataJSON() as Batch).events.some((e) => e.kind === 'PAGE_VIEW' && EVENTS_PATH.test(e.name)),
      { timeout: 15_000 },
    );
    await page.getByRole('link', { name: 'Évènements' }).first().click();
    await page.waitForURL(/\/events/);
    const body = (await ingest).postDataJSON() as Batch;
    expect(body.events.some((e) => e.kind === 'CLICK' && e.name === 'Évènements')).toBeTruthy();

    // Read it back as admin, attributed to the signed-in member.
    await expect.poll(async () => {
      const views = await fetchAudit(adminCtx, { kind: 'PAGE_VIEW', q: '/events' });
      return views.some((v) => EVENTS_PATH.test(v.name) && v.actor?.email === E2E_ADMIN.email);
    }, { timeout: 10_000 }).toBeTruthy();
  });

  test('admin sees and filters the journal in the UI', async ({ page }) => {
    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await page.goto('/admin/audit');

    await expect(page.getByText("Journal d'activité", { exact: true })).toBeVisible();
    const rows = page.locator('tbody tr');
    // This admin's own calls (login, profile) are already in the journal.
    await expect(rows.first()).toBeVisible();

    await page.getByRole('button', { name: 'Pages vues' }).click();
    await expect.poll(async () => {
      const kinds = await rows.locator('td:nth-child(2) [data-slot="badge"]:first-child').allInnerTexts();
      return kinds.length > 0 && kinds.every((k) => k.trim() === 'Page');
    }).toBeTruthy();

    await page.getByRole('button', { name: 'Tout' }).first().click();
    await page.getByRole('searchbox', { name: 'Rechercher une action ou un chemin' }).fill('/admin/audit');
    await expect(rows.first()).toContainText('/admin/audit');
  });
});
