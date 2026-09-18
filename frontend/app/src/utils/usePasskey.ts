import * as Sentry from '@sentry/react';
import {
  type AuthenticationResponseJSON,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  startRegistration,
  WebAuthnError,
} from '@simplewebauthn/browser';
import { useMutation } from '@tanstack/react-query';
import type { AuthenticationApi, PasskeySignal } from 'bagad-client';
import { ResponseError } from 'bagad-client';
import { toast } from '@/components/ui/toast';
import { queryClient, useApiClient } from '../config/client';
import features from './features';
import { isPasskeySnoozed } from './passkeySnooze';

/**
 * Whether the browser supports the conditional (autofill) WebAuthn get.
 *
 * Prefers `PublicKeyCredential.getClientCapabilities().conditionalGet` (the
 * detection the WebAuthn L3 spec and web.dev now recommend), falling back to
 * `isConditionalMediationAvailable()` on browsers that predate it
 * (Chrome < 133, Safari < 17.4). Fail closed.
 */
export async function browserSupportsConditionalGet(): Promise<boolean> {
  if (typeof PublicKeyCredential === 'undefined') {
    return false;
  }
  if ('getClientCapabilities' in PublicKeyCredential) {
    try {
      const capabilities = await PublicKeyCredential.getClientCapabilities();
      return Boolean(capabilities.conditionalGet);
    } catch {
      // Fall through to the legacy detection.
    }
  }
  return await browserSupportsWebAuthnAutofill();
}

/**
 * Best-effort WebAuthn Signal API: tell the passkey provider (Keychain,
 * Google Password Manager…) that the backend no longer knows this credential,
 * so it deletes its orphan copy and stops suggesting a key that can never
 * work again. No-op when the browser or provider lacks support.
 */
export async function signalUnknownPasskey(
  opt: PublicKeyCredentialRequestOptionsJSON | undefined,
  res: AuthenticationResponseJSON | undefined,
) {
  if (
    !res || !opt?.rpId
    || typeof PublicKeyCredential === 'undefined'
    || !('signalUnknownCredential' in PublicKeyCredential)
  ) {
    return;
  }
  try {
    await PublicKeyCredential.signalUnknownCredential({
      rpId: opt.rpId,
      credentialId: res.id,
    });
  } catch {
    // Sync with the provider is opportunistic; ignore failures.
  }
}

/**
 * Best-effort WebAuthn Signal API, proactive flavour: after a passkey is
 * deleted on the site, give the provider the list of credentials the backend
 * still accepts so it drops its copy of the removed one immediately — the
 * reactive `signalUnknownPasskey` would only clean it up after a failed
 * login attempt. The payload comes straight from the DELETE response.
 * No-op when the browser or provider lacks support.
 */
export async function signalAllAcceptedPasskeys(signal: PasskeySignal) {
  if (
    typeof PublicKeyCredential === 'undefined'
    || !('signalAllAcceptedCredentials' in PublicKeyCredential)
  ) {
    return;
  }
  try {
    await PublicKeyCredential.signalAllAcceptedCredentials({
      rpId: signal.rpId,
      userId: signal.userHandle,
      allAcceptedCredentialIds: signal.remainingCredentialIds,
    });
  } catch {
    // Sync with the provider is opportunistic; ignore failures.
  }
}

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
      const registrationOpt = await authApi.preregisterPasskeyApiV1WebauthnPreregisterGet({ flow: 'explicit' }) as PublicKeyCredentialCreationOptionsJSON;

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
 * use, supporting browser — Chrome 128+/Safari 18+). A browser decline is
 * silent by design: an unsupported browser or unmet conditions cost nothing.
 * FIDO guidance says explicit prompts during sign-in perform poorly; this
 * transparent path is the recommended alternative.
 *
 * Rollout is gated on the silentPasskeyUpgrade feature flag (runtime
 * ConfigMap / VITE_FEATURE_SILENT_PASSKEY_UPGRADE), failing closed when
 * absent. Enabled on beta; production keeps the explicit enrolment surfaces
 * only until the flag is flipped there.
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
  if (!features.silentPasskeyUpgrade) return;
  if (!browserSupportsWebAuthn() || isPasskeySnoozed(accountId)) return;

  const createCredential = async (): Promise<RegistrationResponseJSON | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- API response type is not narrowed to the WebAuthn options shape
      const registrationOpt = await authApi.preregisterPasskeyApiV1WebauthnPreregisterGet({ flow: 'silent' }) as PublicKeyCredentialCreationOptionsJSON;
      return await startRegistration({
        optionsJSON: registrationOpt,
        useAutoRegister: true,
      });
    } catch {
      // Expected whenever the browser declines the automatic upgrade
      // (NotAllowedError: unsupported or conditions not met;
      // InvalidStateError: this device already has a passkey). No credential
      // was created, so there is nothing to report, and the next password
      // sign-in may satisfy the conditions.
      return null;
    }
  };
  const attResp = await createCredential();
  if (attResp === null) return;

  // Past this point the OS HAS created a passkey. Failing to persist it
  // server-side leaves an orphan credential in the user's keychain that will
  // 401 at the next passkey login — that must never be swallowed silently.
  try {
    await authApi.registerPasskeyApiV1WebauthnRegisterPost({ requestBody: attResp });
    await queryClient.invalidateQueries({ queryKey: ['passkeys'] });
    toast.add({
      title: 'Une clé d\'accès a été créée pour votre compte sur cet appareil. Vous pourrez vous connecter sans mot de passe.',
      type: 'success',
    });
  } catch (error) {
    // Attach the response detail: the backend returns two distinct 400s
    // ("No registration challenge in session" vs "Invalid registration
    // response") and the bare exception does not say which one.
    let responseDetail: string | undefined = undefined;
    let responseStatus: number | undefined = undefined;
    if (error instanceof ResponseError) {
      responseStatus = error.response.status;
      responseDetail = await error.response.clone().text().catch(() => undefined);
    }
    console.error(
      'Silent passkey upgrade: the device created a credential but server registration failed (orphan passkey)',
      error,
      responseStatus,
      responseDetail,
    );
    Sentry.captureException(error, {
      tags: { feature: 'silent-passkey-upgrade' },
      extra: { responseStatus, responseDetail },
    });
  }
}
