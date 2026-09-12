import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptions,
  PublicKeyCredentialRequestOptions,
} from 'bagad-client';

/**
 * Bridge between the generated API client types and @simplewebauthn/browser.
 *
 * Both sides describe the same WebAuthn Level 2 wire format — the backend
 * validates its responses against pydantic schemas mirroring
 * `PublicKeyCredential*OptionsJSON` — but the generated types are slightly
 * wider (plain `string` where simplewebauthn uses literal unions, `| null`
 * where it uses `| undefined`). The narrowing is therefore sound at runtime
 * and kept in this single documented place instead of scattered casts.
 */

export const toCreationOptionsJSON = (
  options: PublicKeyCredentialCreationOptions,
): PublicKeyCredentialCreationOptionsJSON =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see module doc: same wire format, generated type is wider (string vs literal unions, null vs undefined)
  options as PublicKeyCredentialCreationOptionsJSON;

export const toRequestOptionsJSON = (
  options: PublicKeyCredentialRequestOptions,
): PublicKeyCredentialRequestOptionsJSON =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- see module doc: same wire format, generated type is wider (string vs literal unions, null vs undefined)
  options as PublicKeyCredentialRequestOptionsJSON;
