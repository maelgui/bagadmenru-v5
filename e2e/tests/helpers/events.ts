import { request } from '@playwright/test';
import { E2E_ADMIN, API_URL } from './constants';
import { loginViaAPI } from './auth';

/**
 * Prefix every event created by the E2E suite shares. Cleanup keys off this so
 * it only ever deletes test fixtures, never real events.
 */
export const E2E_EVENT_PREFIX = 'E2E ';

/**
 * Delete the events created by the E2E suite so they don't accumulate on the
 * target environment (beta).
 *
 * Why this exists: `GET /api/v1/events/` is paginated (`limit`, default 10) and
 * ordered by date. Several specs create events and never removed them, so after
 * enough runs the list filled up with leftover fixtures — a freshly created
 * event could fall outside the returned page, and assertions that look it up by
 * title (e.g. event-date.spec) failed with "created event should be returned by
 * the API". Cleaning up after each event-creating spec keeps the list bounded
 * and the lookups reliable.
 *
 * Best-effort and idempotent: it authenticates as the E2E admin (who holds
 * DELETE:EVENT), lists events across a wide window with a high limit, and
 * deletes those whose title starts with the E2E prefix. Misses/failures are
 * swallowed so cleanup never turns a green test run red.
 *
 * @param titlePrefix Restrict deletion to titles starting with this prefix.
 *        Defaults to the shared E2E prefix; pass a more specific prefix to a
 *        single spec's fixtures if desired.
 */
export async function deleteE2EEvents(titlePrefix: string = E2E_EVENT_PREFIX): Promise<void> {
  let token: string;
  try {
    token = await loginViaAPI(E2E_ADMIN.email, E2E_ADMIN.password);
  } catch {
    // Can't authenticate — nothing safe to do. Stay silent (cleanup is hygiene).
    return;
  }

  const ctx = await request.newContext({ baseURL: API_URL });
  try {
    // Cover past and far-future events (specs use tomorrow and 2030) in one
    // page. `date__gte` is inclusive; go back a decade to catch everything.
    const res = await ctx.get('/api/v1/events/?date__gte=2000-01-01&limit=1000', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) return;

    const events = (await res.json()) as Array<{ id: number; title: string }>;
    const toDelete = events.filter((e) => e.title.startsWith(titlePrefix));

    // Delete sequentially: the set is small and this avoids hammering beta.
    for (const event of toDelete) {
      await ctx
        .delete(`/api/v1/events/${event.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => undefined);
    }
  } catch {
    // Swallow: cleanup is best-effort and must not fail the suite.
  } finally {
    await ctx.dispose();
  }
}
