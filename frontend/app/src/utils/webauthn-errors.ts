/**
 * Whether a passkey registration error means "this device already has a passkey
 * for this account" (the WebAuthn duplicate guard), which is benign.
 *
 * @simplewebauthn/browser@14 wraps this case in a `WebAuthnError` with code
 * `ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED` (name `InvalidStateError`). We
 * deliberately match on the error's `code`/`name` rather than `instanceof
 * WebAuthnError`: an `instanceof` check is fragile — if a second copy of the
 * library ends up in the bundle, the thrown instance and the imported class no
 * longer share a prototype and the check silently fails, which surfaced the
 * duplicate registration as an *error* toast instead of the benign
 * "already registered" info.
 *
 * Kept dependency-free (no config/client import) so it is trivially unit
 * testable in isolation.
 */
export function isAlreadyRegisteredError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = 'code' in error ? error.code : undefined;
  const name = 'name' in error ? error.name : undefined;
  return code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED' || name === 'InvalidStateError';
}
