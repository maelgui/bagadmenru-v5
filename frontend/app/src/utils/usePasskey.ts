import {
  browserSupportsWebAuthn,
  type PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
  WebAuthnError,
} from '@simplewebauthn/browser';
import { useMutation } from '@tanstack/react-query';
import type { AuthenticationApi } from 'bagad-client';
import { toast } from '@/components/ui/toast';
import { queryClient, useApiClient } from '../config/client';
import { isPasskeySnoozed } from './passkeySnooze';

/**
 * Reusable passkey enrollment.
 *
 * Wraps the WebAuthn registration ceremony (preregister → browser prompt →
 * register) behind a single mutation, so any surface can offer "add a passkey":
 * the settings section, the post-signup screen, or the future password→passkey
 * migration for existing members.
 *
 * Uses the shared cookie session, so it acts as the currently active account.
 * After an invitation signup the backend has already made the new member the
 * active account (additive session cookie), so enrolment targets them.
 *
 * On success it invalidates the `['passkeys']` query so any visible list
 * refreshes.
 */
export function useRegisterPasskey() {
  const { authApi } = useApiClient();

  return useMutation({
    mutationFn: async (): Promise<RegisterPasskeyResult> => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- API response type is not narrowed to the WebAuthn options shape
      const registrationOpt = await authApi.preregisterPasskeyApiV1WebauthnPreregisterGet() as PublicKeyCredentialCreationOptionsJSON;

      try {
        const attResp = await startRegistration({ optionsJSON: registrationOpt });
        await authApi.registerPasskeyApiV1WebauthnRegisterPost({ requestBody: attResp });
        return { status: 'created' };
      } catch (error) {
        // The browser throws InvalidStateError when the presented authenticator
        // already holds one of the credentials the server listed in
        // `excludeCredentials` - i.e. this device already has a passkey for this
        // account. This is a *normal* user situation (a WebAuthn duplicate
        // guard), not an application failure, so we resolve the mutation with a
        // benign "already registered" outcome instead of rejecting. Rejecting
        // would surface it as an error to react-query and, via the app's error
        // handling, to Sentry.
        if (error instanceof WebAuthnError && error.name === 'InvalidStateError') {
          return { status: 'already-registered' };
        }
        // Any other failure (network, user cancelled/UV refused, etc.) is a real
        // error: let it propagate so the caller/UI can react.
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    },
  });
}

/**
 * Outcome of a passkey enrollment attempt.
 * - `created`: a new passkey was registered.
 * - `already-registered`: the presented authenticator already holds a passkey
 *   for this account (WebAuthn `InvalidStateError`). Not an error.
 */
export interface RegisterPasskeyResult {
  status: 'created' | 'already-registered';
}

/**
 * Silent, best-effort passkey upgrade after a password sign-in ("automatic
 * passkey upgrade", WebAuthn conditional create).
 *
 * With `useAutoRegister` the browser creates a passkey WITHOUT showing any
 * prompt, and only when its own conditions are met (recent password autofill
 * use, supporting browser — Chrome 128+/Safari 18+). There is deliberately no
 * user-visible failure path: a decline simply throws and we swallow it, so an
 * unsupported browser or unmet conditions cost nothing. FIDO guidance says
 * explicit prompts during sign-in perform poorly; this transparent path is the
 * recommended alternative.
 *
 * Respects the per-account snooze (an explicit « Plus tard » elsewhere also
 * silences this path). On success a small "handshake" toast tells the member
 * what their device just did — FIDO recommends confirming OS-level passkey
 * events in the app's own UI.
 */
export async function attemptSilentPasskeyUpgrade(
  authApi: AuthenticationApi,
  accountId: string,
): Promise<void> {
  if (!browserSupportsWebAuthn() || isPasskeySnoozed(accountId)) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- API response type is not narrowed to the WebAuthn options shape
    const registrationOpt = await authApi.preregisterPasskeyApiV1WebauthnPreregisterGet() as PublicKeyCredentialCreationOptionsJSON;
    const attResp = await startRegistration({
      optionsJSON: registrationOpt,
      useAutoRegister: true,
    });
    await authApi.registerPasskeyApiV1WebauthnRegisterPost({ requestBody: attResp });
    await queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    toast.add({
      title: 'Une clé d\'accès a été créée pour votre compte sur cet appareil. Vous pourrez vous connecter sans mot de passe.',
      type: 'success',
    });
  } catch {
    // Expected whenever the browser declines the automatic upgrade
    // (NotAllowedError: unsupported or conditions not met; InvalidStateError:
    // this device already has a passkey). Silent by design — the member never
    // saw anything, so there is nothing to report, and the next password
    // sign-in may satisfy the conditions.
  }
}
