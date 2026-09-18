import { test, expect, request } from '@playwright/test';
import { E2E_USER, API_URL } from './helpers/constants';
import { loginViaUI, loginViaAPI } from './helpers/auth';
import { VirtualAuthenticator } from './helpers/webauthn';
import {
  PASSKEYS_ROUTE,
  clearSession,
  registerPasskeyViaUI,
  normalizeCredentialId,
  deleteAllPasskeys,
  countPasskeys,
  passkeyRow,
  snoozeSilentPasskeyUpgrade,
} from './helpers/passkeys';

/**
 * Passkey (WebAuthn) end-to-end flows — registration, login and deletion —
 * driven entirely through the UI against the real backend. A CDP virtual
 * authenticator signs the real ceremonies; no API is mocked.
 *
 * These flows all mutate a single shared E2E account (passkeys are a global
 * resource of that user), so the whole suite runs SERIALLY: they cannot run in
 * parallel safely without per-worker account isolation. Keeping them in one
 * serial file makes them safe by default under any invocation (`npm test`, CI,
 * local) with no special script to remember.
 *
 * Chromium-only: the CDP WebAuthn virtual authenticator is not available in
 * Firefox/WebKit.
 */
test.describe('Passkeys (WebAuthn)', () => {
  test.describe.configure({ mode: 'serial' });

  let authenticator: VirtualAuthenticator;

  test.beforeEach(async ({ page }) => {
    // These tests drive explicit WebAuthn ceremonies on a shared virtual
    // authenticator; the silent post-login upgrade would race them (see
    // snoozeSilentPasskeyUpgrade). Snooze it for the whole spec.
    await snoozeSilentPasskeyUpgrade(page);
    authenticator = await VirtualAuthenticator.create(page);
  });

  test.afterEach(async () => {
    await authenticator.dispose();
  });

  test.afterAll(async () => {
    // Keep the shared account clean so credentials don't accumulate across runs.
    await deleteAllPasskeys();
  });

  /**
   * Whether the backend still lists a passkey with this credential id. The CDP
   * authenticator returns standard base64 while the backend returns base64url,
   * so both sides are normalized before comparison.
   */
  async function passkeyExists(credentialId: string): Promise<boolean> {
    const token = await loginViaAPI(E2E_USER.email, E2E_USER.password);
    const ctx = await request.newContext({ baseURL: API_URL });
    const res = await ctx.get('/api/v1/webauthn/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const list = (await res.json()) as Array<{ credential_id: string }>;
    await ctx.dispose();
    const target = normalizeCredentialId(credentialId);
    return list.some((p) => normalizeCredentialId(p.credential_id) === target);
  }

  test.describe('registration', () => {
    test('registers a passkey and shows it in the list', async ({ page }) => {
      await loginViaUI(page, E2E_USER.email, E2E_USER.password);
      await page.goto(PASSKEYS_ROUTE);

      const before = await authenticator.getCredentials();
      await authenticator.withSuccessfulCeremony(async () => {
        await page.getByRole('button', { name: 'Ajouter' }).click();
      });

      // Strong oracle: a new resident credential exists on the authenticator.
      const after = await authenticator.getCredentials();
      expect(after.length).toBe(before.length + 1);
      const created = after.find(
        (c) => !before.some((b) => b.credentialId === c.credentialId)
      );
      expect(created?.isResidentCredential).toBe(true);

      // UX oracle: the user sees the newly created passkey appear in the list.
      // Target the exact item by data-credential-id (deterministic; matched
      // regardless of base64/base64url encoding).
      await expect(await passkeyRow(page, created!.credentialId)).toBeVisible();
    });

    test('shows the empty state when the user has no passkey', async ({ page }) => {
      // Guarantee a clean list, then load the section.
      await deleteAllPasskeys();
      await loginViaUI(page, E2E_USER.email, E2E_USER.password);
      await page.goto(PASSKEYS_ROUTE);

      // UX oracle: a first-time user sees the empty state, not a passkey row.
      await expect(page.getByText('Aucune clé d\'accès')).toBeVisible();
      await expect(page.locator('[data-credential-id]')).toHaveCount(0);
    });

    test('re-registering the same authenticator does not create a duplicate', async ({ page }) => {
      await loginViaUI(page, E2E_USER.email, E2E_USER.password);
      await page.goto(PASSKEYS_ROUTE);

      // First registration succeeds.
      const credentialId = await registerPasskeyViaUI(page, authenticator);
      await expect(await passkeyRow(page, credentialId)).toBeVisible();

      // Second attempt with the SAME authenticator: the backend lists the
      // existing credential in excludeCredentials, so the browser throws
      // InvalidStateError. The app handles it gracefully as a benign
      // "already registered" outcome (an info toast) — NOT an error — so it
      // never reaches Sentry and no duplicate is created.
      await authenticator.arm();
      try {
        await page.getByRole('button', { name: 'Ajouter' }).click();

        // The button returns to an enabled/idle state once the mutation settles
        // (it neither stays stuck pending nor gets removed). This is a stable
        // signal that the second attempt resolved.
        await expect(page.getByRole('button', { name: 'Ajouter' })).toBeEnabled({ timeout: 10_000 });
      } finally {
        await authenticator.disarm();
      }

      // Primary oracle (authoritative, non-flaky): the backend still holds
      // exactly one credential — the duplicate-registration path did NOT create
      // a duplicate. Read the source of truth rather than a transient toast.
      expect(await countPasskeys()).toBe(1);

      // The duplicate attempt must never surface the old alarming error toast.
      // On Chromium (this test's virtual authenticator) it is raised as an
      // InvalidStateError and handled as the benign `already-registered`
      // outcome; on Firefox it collapses to NotAllowedError and is shown as a
      // neutral info message. Either way, no scary "error" toast.
      await expect(page.getByText("L'ajout de la clé d'accès n'a pas abouti")).toHaveCount(0);

      // Local oracles: one credential on the authenticator and one row in the UI.
      expect((await authenticator.getCredentials()).length).toBe(1);
      await expect(page.locator('[data-credential-id]')).toHaveCount(1);

      // Best-effort UX check: the app is expected to show an info toast telling
      // the user the device already has a passkey. The toast is transient
      // (auto-dismisses), so this is not used as the pass/fail oracle — it is
      // asserted leniently and only when still visible, to avoid flakiness on
      // slower environments (e.g. beta) where it may fade before assertion.
      const alreadyToast = page.getByText('Cet appareil possède déjà une clé d\'accès', { exact: false });
      if (await alreadyToast.count() > 0) {
        await expect(alreadyToast.first()).toBeVisible();
      }
    });
  });

  test.describe('login', () => {
    test('logs in by clicking the Passkey button', async ({ page }) => {
      // Disable conditional mediation for this test: the login page's
      // mount-time autofill ceremony would otherwise compete with the clicked
      // modal ceremony for the authenticator and the single server-side
      // challenge slot. With it off (a browser without autofill support —
      // @simplewebauthn then skips the conditional ceremony after its
      // challenge fetch), the clicked ceremony is the only one. The
      // conditional path has its own test below.
      await page.addInitScript(() => {
        if (window.PublicKeyCredential) {
          window.PublicKeyCredential.isConditionalMediationAvailable =
            async () => false;
        }
      });
      await loginViaUI(page, E2E_USER.email, E2E_USER.password);
      await page.goto(PASSKEYS_ROUTE);
      await registerPasskeyViaUI(page, authenticator);

      await clearSession(page);
      await page.goto('/auth/login');

      // Let the mount-time challenge fetches settle (their Set-Cookie must
      // not land after the clicked fetch's), then arm BEFORE clicking: the
      // CDP authenticator only auto-completes a modal ceremony that STARTS
      // while presence simulation is on — arming after the modal get() is
      // pending leaves it hanging forever.
      await page.waitForLoadState('networkidle');
      await authenticator.arm();
      try {
        await page.getByRole('button', { name: 'Clé d\'accès' }).click();

        // UX oracle: the user ends up authenticated (left login page AND an
        // authenticated affordance is visible), not merely redirected.
        await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 });
        // The navbar account button reads "Comptes - <name>". Accept either a
        // hyphen or an em dash so the locator survives the app's dash style
        // (the label flipped em dash → hyphen in a codebase-wide sweep).
        await expect(page.getByRole('button', { name: /^Comptes [-—]/ })).toBeVisible({
          timeout: 15_000,
        });
      } finally {
        await authenticator.disarm();
      }
    });

    test('logs in via conditional UI (autofill) without clicking Passkey', async ({ page }) => {
      // A discoverable credential must exist for conditional UI to offer it.
      await loginViaUI(page, E2E_USER.email, E2E_USER.password);
      await page.goto(PASSKEYS_ROUTE);
      await registerPasskeyViaUI(page, authenticator);

      await clearSession(page);

      // In dev, React StrictMode double-mounts the login effect, firing TWO
      // challenge fetches; the second overwrites the first's challenge in the
      // server session, while the CDP authenticator (armed below) may resolve
      // the FIRST ceremony → its POST 401s against the newer challenge.
      // Serve both fetches the SAME cached response (body + Set-Cookie), so
      // every ceremony carries the challenge the session actually holds.
      // Transparent on production builds (single fetch, e.g. beta).
      // Note on multiple Set-Cookie: headers() folds them with '\n' and the
      // Chromium fulfill path splits them back on '\n' (splitSetCookieHeader
      // before Fetch.fulfillRequest), so the round-trip preserves them all —
      // verified against playwright-core 1.63. fulfill() only accepts a
      // headers object, so headersArray() would not be usable here anyway.
      let cachedChallenge: { body: string; headers: { [k: string]: string } } | null = null;
      await page.route('**/api/v1/auth/login', async (route) => {
        if (route.request().method() !== 'GET') {
          await route.fallback();
          return;
        }
        if (cachedChallenge === null) {
          const res = await route.fetch();
          cachedChallenge = { body: await res.text(), headers: res.headers() };
        }
        await route.fulfill({ status: 200, ...cachedChallenge });
      });

      // The login page starts a silent conditional (autofill) assertion on mount
      // (startAuthentication with useBrowserAutofill: true). We do NOT click the
      // Passkey button — arming the authenticator resolves the pending request,
      // exactly as selecting a passkey from the browser autofill prompt would.
      await authenticator.completeConditionalCeremony(async () => {
        await page.goto('/auth/login');
      });

      // UX oracle: conditional autofill signed the user in automatically.
      await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 15_000 });
      // See note above: match hyphen or em dash in the account button label.
      await expect(page.getByRole('button', { name: /^Comptes [-—]/ })).toBeVisible({
        timeout: 15_000,
      });
    });

    test('stays silent when the ceremony is cancelled or fails at login', async ({ page }) => {
      await loginViaUI(page, E2E_USER.email, E2E_USER.password);
      await page.goto(PASSKEYS_ROUTE);
      if ((await page.getByRole('button', { name: 'Supprimer' }).count()) === 0) {
        await registerPasskeyViaUI(page, authenticator);
      }

      await clearSession(page);
      await page.goto('/auth/login');

      // Explicit Passkey-button login with UV refused. The browser reports a
      // deliberate cancel and a UV failure identically (NotAllowedError) and
      // the OS dialog already showed the outcome: the app stays silent (no
      // error alert) and re-arms the conditional (autofill) request. That
      // re-arm fetch is the deterministic proof the failed ceremony was
      // handled: the first challenge GET after the click belongs to the
      // clicked ceremony, the second is the re-arm.
      let challengeFetches = 0;
      const rearmed = page.waitForResponse((res) => {
        if (res.url().includes('/api/v1/auth/login') && res.request().method() === 'GET') {
          challengeFetches += 1;
          return challengeFetches >= 2;
        }
        return false;
      });
      await authenticator.withFailedCeremony(
        async () => {
          await page.getByRole('button', { name: 'Clé d\'accès' }).click();
          await rearmed;
        },
        async () => {
          await expect(page.getByText('Erreur de connexion')).not.toBeVisible();
        }
      );

      await expect(page).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe('deletion', () => {
    test('deletes a passkey via the confirmation dialog', async ({ page }) => {
      await loginViaUI(page, E2E_USER.email, E2E_USER.password);
      await page.goto(PASSKEYS_ROUTE);

      // Create a passkey and confirm the backend persisted it.
      const credentialId = await registerPasskeyViaUI(page, authenticator);
      expect(await passkeyExists(credentialId)).toBe(true);

      // Delete this exact passkey via its row (matched by data-credential-id,
      // regardless of base64/base64url encoding).
      const item = await passkeyRow(page, credentialId);
      await item.getByRole('button', { name: 'Supprimer' }).click();
      const dialog = page.getByRole('alertdialog');
      await expect(dialog.getByText('Supprimer cette clé d\'accès ?')).toBeVisible();
      await dialog.getByRole('button', { name: 'Supprimer' }).click();

      // UX oracle: the exact row disappears from the list.
      await expect(item).toHaveCount(0);

      // Backend oracle: the specific credential is gone from the user's list.
      await expect(async () => {
        expect(await passkeyExists(credentialId)).toBe(false);
      }).toPass({ timeout: 30_000 });
    });

    test('cancelling the dialog keeps the passkey', async ({ page }) => {
      await loginViaUI(page, E2E_USER.email, E2E_USER.password);
      await page.goto(PASSKEYS_ROUTE);

      const credentialId = await registerPasskeyViaUI(page, authenticator);
      const item = await passkeyRow(page, credentialId);

      // Open the confirmation dialog, then cancel.
      await item.getByRole('button', { name: 'Supprimer' }).click();
      const dialog = page.getByRole('alertdialog');
      await expect(dialog.getByText('Supprimer cette clé d\'accès ?')).toBeVisible();
      await dialog.getByRole('button', { name: 'Annuler' }).click();

      // UX oracle: dialog closed and the passkey is still listed.
      await expect(dialog).toHaveCount(0);
      await expect(item).toBeVisible();

      // Backend oracle: nothing was deleted.
      expect(await passkeyExists(credentialId)).toBe(true);
    });
  });
});
