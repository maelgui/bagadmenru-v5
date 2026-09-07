import { test, expect, type APIRequestContext } from '@playwright/test';
import { E2E_ADMIN } from './helpers/constants';
import { createAuthenticatedContext, loginViaUI } from './helpers/auth';
import { deleteE2EEvents } from './helpers/events';

/**
 * Regression test for the event date off-by-one bug.
 *
 * The generated API client serializes an event's `date` with
 * `toISOString().substring(0, 10)`, which is UTC. Before the fix, a date
 * built at local midnight in a positive-offset timezone (e.g. Europe/Paris,
 * UTC+2) rolled back to the previous calendar day on the wire — picking the
 * 29th persisted the 28th.
 *
 * This test drives the real add-event form through the browser (the only path
 * that reproduces the bug: a pure API call already sends a YYYY-MM-DD string)
 * and asserts the persisted date equals the picked date.
 *
 * The browser timezone is pinned to Europe/Paris (a positive UTC offset) so the
 * regression is caught regardless of the runner's own timezone. Without this,
 * a UTC runner (e.g. CI) would never trigger the shift and the test would pass
 * even against the buggy code.
 */
test.describe('Event date selection', () => {
  // Pin a positive-offset timezone: this is where the UTC serialization bug
  // shows up. On a UTC runner the local midnight and UTC midnight coincide, so
  // the shift would not occur and the test would give a false pass.
  test.use({ timezoneId: 'Europe/Paris' });

  let adminCtx: APIRequestContext;

  test.beforeAll(async () => {
    adminCtx = await createAuthenticatedContext(E2E_ADMIN.email, E2E_ADMIN.password);
  });

  test.afterAll(async () => {
    // Remove events this spec created so they don't accumulate on beta and
    // eventually push a freshly created event past the list's page limit.
    await deleteE2EEvents();
    await adminCtx.dispose();
  });

  test('the picked date is stored as-is, without an off-by-one shift', async ({ page }) => {
    // A fixed future calendar date, far enough ahead to stay in the future and
    // unambiguous. The exact day is what matters for the round-trip check.
    const pickedDate = '2030-09-29';
    const title = `E2E Date Selection - ${Date.now()}`;

    await loginViaUI(page, E2E_ADMIN.email, E2E_ADMIN.password);

    await page.goto('/events/add');
    await page.waitForLoadState('networkidle');

    await page.fill('#title', title);
    await page.fill('#description', 'Vérifie que la date choisie est bien enregistrée (E2E).');

    // The native date input takes/returns YYYY-MM-DD directly.
    await page.fill('#date', pickedDate);

    // Default category is "sortie"; submit the form.
    await page.getByRole('button', { name: 'Enregistrer' }).click();

    // On success the app navigates to the management page.
    await page.waitForURL((url) => url.pathname.includes('/events/manage'), {
      timeout: 10_000,
    });

    // Verify against the source of truth (the API), not just the rendered UI.
    // Query from the day *before* the picked date so a buggy off-by-one shift
    // still returns the event — that way the assertion compares the stored day
    // explicitly ("expected 2030-09-29, got 2030-09-28") instead of silently
    // dropping the event below the range.
    const res = await adminCtx.get('/api/v1/events/?date__gte=2030-09-28');
    expect(res.ok()).toBeTruthy();

    const events: Array<{ title: string; date: string }> = await res.json();
    const created = events.find((e) => e.title === title);

    expect(created, 'created event should be returned by the API').toBeDefined();
    // The backend serializes `date` as a YYYY-MM-DD string. It must match the
    // day the user picked — not the day before.
    expect(created!.date.substring(0, 10)).toBe(pickedDate);
  });
});
