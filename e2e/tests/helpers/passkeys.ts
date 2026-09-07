import { type Locator, type Page, expect, request } from '@playwright/test';
import { E2E_USER, API_URL } from './constants';
import { loginViaAPI } from './auth';
import { VirtualAuthenticator } from './webauthn';

/**
 * Passkeys section route (the account "Sécurité" settings page). The legacy
 * /profile/passkeys path redirects here.
 */
export const PASSKEYS_ROUTE = '/profile/settings/security';

/**
 * Clear the session client-side. Used to simulate "signed out" without
 * following the app's real logout, which redirects off-app.
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Register a passkey through the UI (click "Ajouter" and complete the ceremony)
 * and return the credential id that was created on the authenticator.
 * Assumes the passkeys page is already loaded.
 */
export async function registerPasskeyViaUI(
  page: Page,
  authenticator: VirtualAuthenticator
): Promise<string> {
  const before = await authenticator.getCredentials();
  await authenticator.withSuccessfulCeremony(async () => {
    await page.getByRole('button', { name: 'Ajouter' }).click();
  });
  const after = await authenticator.getCredentials();
  const created = after.find(
    (c) => !before.some((b) => b.credentialId === c.credentialId)
  );
  expect(created, 'a new credential must have been created').toBeTruthy();
  return created!.credentialId;
}

/**
 * Normalize a credential id for comparison. The CDP virtual authenticator
 * returns standard base64 (+ /), while the backend returns base64url (- _).
 * Comparing the normalized form lets us match the same credential across both.
 */
export function normalizeCredentialId(id: string): string {
  return id.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Locate the passkey list row for a given credential id, matching regardless of
 * base64 vs base64url encoding. The DOM exposes the backend's (base64url) id via
 * data-credential-id, while the CDP authenticator yields standard base64, so we
 * resolve the exact DOM attribute value by normalized comparison.
 */
export async function passkeyRow(page: Page, credentialId: string): Promise<Locator> {
  const target = normalizeCredentialId(credentialId);
  const items = page.locator('[data-credential-id]');
  await expect
    .poll(async () => {
      const ids = await items.evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-credential-id') ?? '')
      );
      return ids.map((id) => id.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
    }, { timeout: 10_000 })
    .toContain(target);
  const domId = await items.evaluateAll(
    (els, t) =>
      els
        .map((el) => el.getAttribute('data-credential-id') ?? '')
        .find((id) => id.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') === t) ?? '',
    target
  );
  return page.locator(`[data-credential-id="${domId}"]`);
}

/**
 * Delete all passkeys on the E2E user account via the API. Keeps the shared
 * test account clean so the passkey suite doesn't accumulate credentials across
 * runs (which slows ceremonies and degrades determinism). Safe: this is a
 * dedicated test account and these are test-created credentials.
 */
export async function deleteAllPasskeys(): Promise<void> {
  const token = await loginViaAPI(E2E_USER.email, E2E_USER.password);
  const ctx = await request.newContext({ baseURL: API_URL });
  try {
    const res = await ctx.get('/api/v1/webauthn/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) return;
    const list = (await res.json()) as Array<{ credential_id: string }>;
    for (const p of list) {
      await ctx.delete(`/api/v1/webauthn/${encodeURIComponent(p.credential_id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } finally {
    await ctx.dispose();
  }
}

/**
 * Count the passkeys currently registered on the E2E user account via the API.
 *
 * This is the authoritative, non-flaky oracle for "no duplicate was created":
 * it reads the backend's source of truth instead of relying on a transient UI
 * toast. Returns 0 if the list cannot be fetched.
 */
export async function countPasskeys(): Promise<number> {
  const token = await loginViaAPI(E2E_USER.email, E2E_USER.password);
  const ctx = await request.newContext({ baseURL: API_URL });
  try {
    const res = await ctx.get('/api/v1/webauthn/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) return 0;
    const list = (await res.json()) as unknown[];
    return list.length;
  } finally {
    await ctx.dispose();
  }
}

