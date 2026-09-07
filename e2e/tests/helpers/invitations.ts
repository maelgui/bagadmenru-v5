import { request } from '@playwright/test';
import { E2E_ADMIN, API_URL } from './constants';
import { loginViaAPI } from './auth';

/** The invitation token + signup URL returned by POST /api/v1/invitations. */
export interface CreatedInvitation {
  token: string;
  url: string;
  channel: 'link' | 'email';
  expires_in: number;
}

/**
 * Create an invitation via the API as the E2E admin (who holds the
 * CREATE:INVITATION permission).
 *
 * - channel 'link': the target email is NOT proven, so signing up requires an
 *   emailed OTP.
 * - channel 'email': the backend sends the invitation to `email`, proving that
 *   address; signing up with the same address skips the OTP.
 */
export async function createInvitation(
  channel: 'link' | 'email',
  email?: string,
): Promise<CreatedInvitation> {
  const token = await loginViaAPI(E2E_ADMIN.email, E2E_ADMIN.password);
  const ctx = await request.newContext({ baseURL: API_URL });
  try {
    const res = await ctx.post('/api/v1/invitations', {
      headers: { Authorization: `Bearer ${token}` },
      data: { channel, ...(email ? { email } : {}) },
    });
    if (!res.ok()) {
      throw new Error(
        `Create invitation failed: ${res.status()} ${await res.text()}`,
      );
    }
    return (await res.json()) as CreatedInvitation;
  } finally {
    await ctx.dispose();
  }
}

/**
 * Fetch the first available public instrument id (needed for the signup form).
 * The instruments list is seeded by `seed-e2e`.
 */
export async function firstInstrumentName(): Promise<string> {
  const ctx = await request.newContext({ baseURL: API_URL });
  try {
    const res = await ctx.get('/api/v1/instruments');
    if (!res.ok()) {
      throw new Error(`List instruments failed: ${res.status()}`);
    }
    const list = (await res.json()) as Array<{ id: number; name: string }>;
    if (list.length === 0) throw new Error('No instruments seeded for E2E');
    return list[0].name;
  } finally {
    await ctx.dispose();
  }
}

/**
 * Deactivate the account created for a signup e2e (by email) so the profile
 * list stays tidy across runs. Uses the admin profile API (soft delete). Tests
 * use a unique email per run, so this is best-effort hygiene, not a correctness
 * dependency. Silently ignores misses.
 */
export async function deleteMemberByEmail(email: string): Promise<void> {
  const token = await loginViaAPI(E2E_ADMIN.email, E2E_ADMIN.password);
  const ctx = await request.newContext({ baseURL: API_URL });
  try {
    const res = await ctx.get('/api/v1/profiles/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) return;
    const list = (await res.json()) as Array<{ id: string; email: string }>;
    const match = list.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!match) return;
    await ctx.delete(`/api/v1/profiles/${match.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } finally {
    await ctx.dispose();
  }
}

/** A unique email for a signup e2e run (kept on the bagadmenru.bzh domain). */
export function uniqueInviteEmail(prefix = 'invite'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}@bagadmenru.bzh`;
}
