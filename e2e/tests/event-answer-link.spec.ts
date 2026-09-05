import { test, expect, request, type APIRequestContext } from '@playwright/test';
import {
  waitForEmailByCorrelationId,
  extractLinks,
  deleteEmail,
  newCorrelationId,
} from './helpers/mailpit';
import { E2E_USER, E2E_ADMIN, API_URL, CORRELATION_ID_HEADER } from './helpers/constants';
import { createAuthenticatedContext } from './helpers/auth';

/**
 * Event response via the email quick link.
 *
 * When an admin creates an event, the backend emails eligible members a
 * "[Nouvelle sortie] ..." message containing a quick link of the form
 * {frontend_url}/s/answer/{token}. Clicking it opens a page that lets the
 * member confirm attendance without logging in — the token itself authorizes
 * the GET /api/v1/responses/link/prepare and PUT /api/v1/responses/link/save
 * calls (the token is sent in the `token` header).
 */
test.describe('Event response via email quick link', () => {
  // Run serially: these tests share one Mailpit inbox. Each request carries a
  // unique X-Correlation-ID and we match the resulting email by that header,
  // so interleaving is safe, but serial keeps inbox reads predictable.
  test.describe.configure({ mode: 'serial' });

  let adminCtx: APIRequestContext;

  test.beforeAll(async () => {
    adminCtx = await createAuthenticatedContext(E2E_ADMIN.email, E2E_ADMIN.password);
  });

  test.afterAll(async () => {
    await adminCtx.dispose();
  });

  /**
   * Create an event as admin and return the quick-link email sent to E2E_USER.
   *
   * The create-event request carries a unique correlation ID; the backend
   * propagates it to the (background-task) notification email as an
   * X-Correlation-ID header, letting us fetch exactly this email regardless of
   * subject/title or other messages sharing the inbox.
   */
  async function createEventAndGetLinkEmail(title: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const correlationId = newCorrelationId();
    const res = await adminCtx.post('/api/v1/events/', {
      headers: { [CORRELATION_ID_HEADER]: correlationId },
      data: {
        title,
        date: dateStr,
        description: 'Réponse via lien email (E2E)',
        category: 'repetition',
        costume: 'POLO',
        // The new-event notification email is only sent when the event is in
        // the doodle (see create_event -> notify_new_event trigger).
        is_in_doodle: true,
      },
    });
    expect(res.ok()).toBeTruthy();
    // The backend echoes the correlation ID back on the response.
    expect(res.headers()[CORRELATION_ID_HEADER.toLowerCase()]).toBe(correlationId);

    // The notification email is sent as a background task. Match on the
    // correlation ID (stamped as an email header) rather than the subject.
    const email = await waitForEmailByCorrelationId(correlationId, {
      to: E2E_USER.email,
      timeout: 20_000,
    });
    expect(email.Subject).toContain(title);

    const links = extractLinks(email.HTML);
    const answerLink = links.find((l) => l.includes('/s/answer/'));
    expect(answerLink, 'quick-link /s/answer/{token} in email').toBeDefined();

    return { email, answerLink: answerLink! };
  }

  /** Extract the raw token from a /s/answer/{token} link. */
  function tokenFromLink(link: string): string {
    const match = link.match(/\/s\/answer\/([^/?#]+)/);
    expect(match, 'token in answer link').not.toBeNull();
    return match![1];
  }

  test('member can answer an event through the email link (UI)', async ({ page }) => {
    const title = `E2E Answer Link UI - ${Date.now()}`;
    const { email, answerLink } = await createEventAndGetLinkEmail(title);

    // Visit the quick link exactly as the member would from their inbox.
    await page.goto(answerLink);

    // The event to respond to is shown, along with the answer buttons.
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });
    const yesButton = page.getByRole('button', { name: /Oui, je serai là/i });
    await expect(yesButton).toBeVisible({ timeout: 10_000 });

    // Confirm attendance.
    await yesButton.click();

    // The page confirms the saved response.
    await expect(page.getByText('Vous serez présent')).toBeVisible({
      timeout: 10_000,
    });

    await deleteEmail(email.ID);
  });

  test('token from the email authorizes prepare + save via the API', async () => {
    const title = `E2E Answer Link API - ${Date.now()}`;
    const { email, answerLink } = await createEventAndGetLinkEmail(title);
    const token = tokenFromLink(answerLink);

    const ctx = await request.newContext({ baseURL: API_URL });

    // GET /link/prepare returns the event to answer, keyed by the token.
    const prepare = await ctx.get('/api/v1/responses/link/prepare', {
      headers: { token },
    });
    expect(prepare.ok()).toBeTruthy();
    const prepareBody = await prepare.json();
    expect(prepareBody.event.title).toBe(title);

    // PUT /link/save stores the response.
    const save = await ctx.put('/api/v1/responses/link/save', {
      headers: { token },
      data: { value: false },
    });
    expect(save.ok()).toBeTruthy();
    const saved = await save.json();
    expect(saved.value).toBe(false);
    expect(saved.event_id).toBe(prepareBody.event.id);

    // Preparing again reflects the persisted answer.
    const prepareAgain = await ctx.get('/api/v1/responses/link/prepare', {
      headers: { token },
    });
    expect(prepareAgain.ok()).toBeTruthy();
    const afterBody = await prepareAgain.json();
    expect(afterBody.response.value).toBe(false);

    await ctx.dispose();
    await deleteEmail(email.ID);
  });

  test('an invalid token is rejected by the API', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/responses/link/prepare', {
      headers: { token: 'not-a-valid-token' },
    });
    expect(res.status()).toBe(403);
    await ctx.dispose();
  });
});
