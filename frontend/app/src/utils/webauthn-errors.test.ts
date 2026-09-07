import { describe, expect, it } from 'vitest';
import { WebAuthnError } from '@simplewebauthn/browser';
import { isAlreadyRegisteredError } from './webauthn-errors';

describe('isAlreadyRegisteredError', () => {
  it('matches the WebAuthnError raised by @simplewebauthn/browser@14 for a duplicate', () => {
    // This mirrors exactly what startRegistration() throws when the device
    // already holds a credential the server excluded: a WebAuthnError whose
    // name is inherited from the underlying InvalidStateError DOMException and
    // whose code is ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED.
    const cause = new DOMException('The authenticator was previously registered', 'InvalidStateError');
    const error = new WebAuthnError({
      message: 'The authenticator was previously registered',
      code: 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED',
      cause,
    });
    expect(isAlreadyRegisteredError(error)).toBe(true);
  });

  it('matches even if the error is not a WebAuthnError instance (bundle-duplication safety)', () => {
    // The bug being fixed: an `instanceof WebAuthnError` check fails when the
    // thrown instance comes from a second copy of the library. A plain object
    // carrying the same code must still be recognized.
    const errorLike = {
      name: 'WebAuthnError',
      code: 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED',
    };
    expect(isAlreadyRegisteredError(errorLike)).toBe(true);
  });

  it('matches a raw InvalidStateError DOMException by name', () => {
    const dom = new DOMException('previously registered', 'InvalidStateError');
    expect(isAlreadyRegisteredError(dom)).toBe(true);
  });

  it('does NOT match other WebAuthn errors (they must propagate as real errors)', () => {
    const notAllowed = new DOMException('user cancelled', 'NotAllowedError');
    expect(isAlreadyRegisteredError(notAllowed)).toBe(false);

    const generic = new Error('network down');
    expect(isAlreadyRegisteredError(generic)).toBe(false);
  });

  it('does not throw on null/undefined', () => {
    expect(isAlreadyRegisteredError(null)).toBe(false);
    expect(isAlreadyRegisteredError(undefined)).toBe(false);
  });
});
