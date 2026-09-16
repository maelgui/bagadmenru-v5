import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { queryClient } from '../../../config/client';
import { isPasskeySnoozed } from '../../../utils/passkeySnooze';

interface UsersApiLike {
  getMyProfileApiV1ProfilesMeGet: () => Promise<{ id: string; hasPassword?: boolean | null }>;
}

/** What the recovery landing should offer once the member is signed in. */
export interface RecoveryNext {
  accountId: string;
  /** The account has a password (only exposed on /profiles/me). */
  hasPassword: boolean;
  /** Passkey creation is possible here (supported browser, not snoozed). */
  offerPasskey: boolean;
}

/**
 * Post sign-in bookkeeping shared by the recovery entry points (emailed link
 * and emailed code): reset the query cache like a login, warm the new
 * profile, and decide what to offer next.
 *
 * Returns `null` when there is nothing to offer and the caller should
 * navigate straight home (passkey unsupported/snoozed on a passwordless
 * account, or the profile could not be warmed — signed in either way).
 */
export async function warmSessionAfterRecovery(
  usersApi: UsersApiLike,
): Promise<RecoveryNext | null> {
  queryClient.clear();
  try {
    const me = await usersApi.getMyProfileApiV1ProfilesMeGet();
    queryClient.setQueryData(['profiles', 'me'], me);
    const hasPassword = me.hasPassword === true;
    const offerPasskey = browserSupportsWebAuthn() && !isPasskeySnoozed(me.id);
    // A password account always gets the landing (it must be able to replace
    // the forgotten password even where passkeys are unavailable); a
    // passkey-only account only needs it for the passkey offer itself.
    if (hasPassword || offerPasskey) {
      return { accountId: me.id, hasPassword, offerPasskey };
    }
  } catch {
    // Signed in but could not warm the profile: skip the offer.
  }
  return null;
}
