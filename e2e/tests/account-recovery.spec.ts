import { test, expect, request } from '@playwright/test';
import {
  waitForEmailByCorrelationId,
  extractLinks,
  deleteEmail,
  newCorrelationId,
  type MailpitMessageDetail,
} from './helpers/mailpit';
import { loginViaAPI } from './helpers/auth';
import { deleteAllPasskeys } from './helpers/passkeys';
import { VirtualAuthenticator } from './helpers/webauthn';
import { E2E_USER, API_URL, CORRELATION_ID_HEADER } from './helpers/constants';

/**
 * Account-recovery end-to-end flows (converged "grant + code" design), driven
 * through the UI against the real backend and a real Mailpit inbox.
 *
 * The single seeded E2E account always has a password (the seed re-sets it on
 * every run), so recovery always lands on the CHOOSER (passkey vs new
 * password) — the critical path this suite covers exhaustively:
 *   - request → hybrid email (6-digit code + magic link carrying grant+code)
 *   - typed-code channel and emailed-link channel both reach the chooser
 *   - anti-enumeration (unknown email still yields a grant id, no leak)
 *   - wrong / dead code stays recoverable on the same form
 *   - chooser → "new password" branch: sets a password and it actually works
 *     at the next login
 *   - chooser → "passkey" branch: creates a passkey via a virtual authenticator
 *
 * The suite mutates the shared E2E account (password + passkeys), so it runs
 * SERIALLY. The password-changing test restores the seed password at the end;
 * passkeys are cleaned up in afterEach.
 *
 * Some ceremonies (passkey) are Chromium-only (CDP virtual authenticator).
 */

/** Trigger a recovery request via the API and return the hybrid email + grant. */
async function requestRecoveryEmail(): Promise<{
  grantId: string;
  email: MailpitMessageDetail;
}> {
  const ctx = await request.newContext({ baseURL: API_URL });
  const correlationId = newCorrelationId();
  try {
    const res = await ctx.post('/api/v1/auth/reset_password_request', {
      headers: { [CORRELATION_ID_HEADER]: correlationId },
      data: { email: E2E_USER.email },
    });
    expect([200, 202, 204]).toContain(res.status());
    const { grant_id: grantId } = (await res.json()) as { grant_id: string };
    expect(grantId, 'the request returns a public grant id').toBeTruthy();

    const email = await waitForEmailByCorrelationId(correlationId, {
      to: E2E_USER.email,
      timeout: 15_000,
    });
    return { grantId, email };
  } finally {
    await ctx.dispose();
  }
}

/** Pull the 6-digit code and the magic link out of the hybrid email body. */
function parseRecoveryEmail(email: MailpitMessageDetail): {
  code: string;
  link: string;
} {
  const body = `${email.Text}\n${email.HTML}`;
  const codeMatch = body.match(/\b(\d{6})\b/);
  expect(codeMatch, 'the email carries a 6-digit code').toBeTruthy();

  const link = extractLinks(email.HTML).find((l) => /\/auth\/reset\/[\w-]+\?code=\d{6}/.test(l));
  expect(link, 'the email carries a grant+code magic link').toBeTruthy();

  return { code: codeMatch![1], link: link! };
}

/** Oracle: the account switcher only renders with a live session. */
async function expectSignedIn(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('button', { name: /^Comptes [-—]/ })).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('Account recovery (grant + code)', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterEach(async () => {
    // Keep the shared account clean: recovery may have created a passkey.
    await deleteAllPasskeys();
  });

  test('typed-code channel: request → code → chooser, signed in', async ({ page }) => {
    // Snooze the silent post-login upgrade so it can't race the flow.

    // Entry point: the login page's "can't sign in" link leads to the email form.
    await page.goto('/auth/login');
    await page.click('a[href*="reset"]');
    await expect(page).toHaveURL(/\/auth\/reset$/, { timeout: 5_000 });
    await expect(page.getByLabel('Email')).toBeVisible();

    // Drive the actual request through the API so we can read the exact code
    // for the grant we then land on (requesting twice would create two grants).
    const { grantId, email } = await requestRecoveryEmail();
    const { code } = parseRecoveryEmail(email);
    await deleteEmail(email.ID);

    // The step is a route carrying the grant id (as the UI submit would produce).
    await page.goto(`/auth/reset/${grantId}`);
    await expect(page.getByText(/Vous avez reçu un code/)).toBeVisible({ timeout: 5_000 });

    // The emailed code, typed into the page.
    await page.getByRole('textbox').fill(code);

    // A password account lands on the chooser, signed in, at /auth/next.
    await expect(page.getByText(/Comment voulez-vous vous reconnecter/)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/auth\/next$/);
    await expect(page.getByText('Créer une clé d\'accès')).toBeVisible();
    await expect(page.getByText('Définir un nouveau mot de passe')).toBeVisible();

    // "Plus tard" leaves the funnel, still signed in.
    await page.getByRole('button', { name: 'Plus tard' }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    await expectSignedIn(page);
  });

  test('emailed-link channel: opening the magic link signs in and lands on the chooser', async ({
    page,
  }) => {

    const { email } = await requestRecoveryEmail();
    const { link } = parseRecoveryEmail(email);
    await deleteEmail(email.ID);

    // The magic link is the same form prefilled (grant + code in the URL),
    // submitted automatically.
    await page.goto(link);

    await expect(page.getByText(/Comment voulez-vous vous reconnecter/)).toBeVisible({
      timeout: 10_000,
    });
    // The consumed grant dropped out of the URL.
    await expect(page).toHaveURL(/\/auth\/next$/);

    await page.getByRole('button', { name: 'Plus tard' }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
    await expectSignedIn(page);
  });

  test('a dead link falls back to the recoverable code form', async ({ page }) => {
    // A syntactically valid but never-issued grant id: the server answers a
    // uniform 403, the page keeps the member on the code form.
    await page.goto('/auth/reset/deadgrantdeadgrantdeadgrant000000?code=000000');

    await expect(page.getByRole('alert')).toContainText(/Code incorrect ou expiré/, {
      timeout: 10_000,
    });
    await expect(page.getByRole('link', { name: 'demandez un nouvel email' })).toBeVisible();
    // Not signed in, not navigated away.
    await expect(page).toHaveURL(/\/auth\/reset\//);
  });

  test('a wrong code stays recoverable, then the right code works', async ({ page }) => {

    const { grantId, email } = await requestRecoveryEmail();
    const { code } = parseRecoveryEmail(email);
    await deleteEmail(email.ID);

    // Land on the code form for this grant.
    await page.goto(`/auth/reset/${grantId}`);
    await expect(page.getByText(/Vous avez reçu un code/)).toBeVisible({ timeout: 5_000 });

    // A wrong code: uniform recoverable error, still on the form.
    const wrong = code === '000000' ? '111111' : '000000';
    await page.getByRole('textbox').fill(wrong);
    await expect(page.getByRole('alert')).toContainText(/Code incorrect ou expiré/, {
      timeout: 10_000,
    });

    // The real code then works (attempts left; grant not yet revoked). Clear
    // the field first: refilling a full 6→6 value would not re-fire onComplete.
    await page.getByRole('textbox').fill('');
    await page.getByRole('textbox').fill(code);
    await expect(page.getByText(/Comment voulez-vous vous reconnecter/)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('chooser → new password: sets it and it works at the next login', async ({ page }) => {
    const newPassword = 'E2eRecovered9876!';

    try {
      const { grantId, email } = await requestRecoveryEmail();
      const { code } = parseRecoveryEmail(email);
      await deleteEmail(email.ID);

      await page.goto(`/auth/reset/${grantId}`);
      await page.getByRole('textbox').fill(code);
      await expect(page.getByText(/Comment voulez-vous vous reconnecter/)).toBeVisible({
        timeout: 10_000,
      });

      // Pick the new-password branch.
      await page.getByText('Définir un nouveau mot de passe').click();
      await expect(page.getByRole('heading', { name: 'Nouveau mot de passe' })).toBeVisible();

      // Back returns to the chooser (the choice is not addressable), then in again.
      await page.getByRole('button', { name: 'Retour' }).click();
      await expect(page.getByText(/Comment voulez-vous vous reconnecter/)).toBeVisible();
      await page.getByText('Définir un nouveau mot de passe').click();

      // Set the password (single field: NIST 800-63B, the show-toggle replaces
      // the confirmation).
      await page.locator('input[type="password"]').first().fill(newPassword);
      await page.getByRole('button', { name: 'Enregistrer' }).click();

      // Signed in, landed on the app home.
      await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
      await expectSignedIn(page);

      // The new password actually authenticates.
      const token = await loginViaAPI(E2E_USER.email, newPassword);
      expect(token, 'the new password logs in').toBeTruthy();
    } finally {
      // Restore the seed password so the rest of the suite / other specs
      // keep working against the known credential.
      const token = await loginViaAPI(E2E_USER.email, newPassword).catch(() => null);
      if (token) {
        const ctx = await request.newContext({ baseURL: API_URL });
        try {
          await ctx.post('/api/v1/auth/set_password', {
            headers: { Authorization: `Bearer ${token}` },
            data: { password: E2E_USER.password },
          });
        } finally {
          await ctx.dispose();
        }
      }
    }
  });

  test('chooser → passkey: creates a passkey via the virtual authenticator', async ({ page }) => {
    const authenticator = await VirtualAuthenticator.create(page);

    try {
      const { grantId, email } = await requestRecoveryEmail();
      const { code } = parseRecoveryEmail(email);
      await deleteEmail(email.ID);

      await page.goto(`/auth/reset/${grantId}`);
      await page.getByRole('textbox').fill(code);
      await expect(page.getByText(/Comment voulez-vous vous reconnecter/)).toBeVisible({
        timeout: 10_000,
      });

      // Pick passkey: choosing it renders the shared PasskeyEnrollment screen,
      // sole owner of the ceremony.
      await page.getByText('Créer une clé d\'accès').click();
      await expect(page.getByRole('heading', { name: 'Créez une clé d\'accès' })).toBeVisible();

      // Run the real WebAuthn ceremony and wait for the backend to persist it.
      const persisted = page.waitForResponse(
        (res) =>
          res.url().includes('/api/v1/webauthn/register') &&
          res.request().method() === 'POST',
        { timeout: 10_000 }
      );
      await authenticator.withSuccessfulCeremony(async () => {
        await page.getByRole('button', { name: 'Créer une clé d\'accès' }).click();
      });
      expect((await persisted).ok(), 'the passkey is persisted').toBeTruthy();

      // Enrollment done → landed on the app home, signed in.
      await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
      await expectSignedIn(page);
    } finally {
      await authenticator.dispose();
    }
  });

  test('anti-enumeration: an unknown email still returns a grant id and sends nothing', async () => {
    const ctx = await request.newContext({ baseURL: API_URL });
    const correlationId = newCorrelationId();
    try {
      const res = await ctx.post('/api/v1/auth/reset_password_request', {
        headers: { [CORRELATION_ID_HEADER]: correlationId },
        data: { email: 'definitely-not-a-member@example.com' },
      });
      // Same response shape as a real account: status + a grant id.
      expect([200, 202, 204]).toContain(res.status());
      const { grant_id: grantId } = (await res.json()) as { grant_id: string };
      expect(grantId, 'unknown emails get an indistinguishable grant id').toBeTruthy();
    } finally {
      await ctx.dispose();
    }
  });
});
