import {
  type PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from '@simplewebauthn/browser';
import { useMutation } from '@tanstack/react-query';
import { queryClient, useApiClient } from '../config/client';
import { isAlreadyRegisteredError } from './webauthn-errors';

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
        // `excludeCredentials` — i.e. this device already has a passkey for this
        // account. This is a *normal* user situation (a WebAuthn duplicate
        // guard), not an application failure, so we resolve the mutation with a
        // benign "already registered" outcome instead of rejecting. Rejecting
        // would surface it as an error to react-query and, via the app's error
        // handling, to Sentry.
        if (isAlreadyRegisteredError(error)) {
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
