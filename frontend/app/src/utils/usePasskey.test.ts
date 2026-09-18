// @vitest-environment jsdom
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

const startRegistration = vi.fn();
let webauthnSupported = true;
let webauthnAutofillSupported = false;
// Hoisted: these are read while the mock factories execute, before the test
// file body runs.
const {
  toastAdd, invalidateQueries, sentryCapture, mockEnv,
} = vi.hoisted(() => {
  // Mutable so each test can flip the feature flag; the silent upgrade is
  // gated on VITE_FEATURE_SILENT_PASSKEY_UPGRADE (fail closed).
  const hoistedEnv: { VITE_FEATURE_SILENT_PASSKEY_UPGRADE?: string } = {
    VITE_FEATURE_SILENT_PASSKEY_UPGRADE: 'true',
  };
  return {
    toastAdd: vi.fn(),
    invalidateQueries: vi.fn(),
    sentryCapture: vi.fn(),
    mockEnv: hoistedEnv,
  };
});

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => webauthnSupported,
  browserSupportsWebAuthnAutofill: async () => await Promise.resolve(webauthnAutofillSupported),
  startRegistration: (...args: unknown[]) => startRegistration(...args) as unknown,
  WebAuthnError: class WebAuthnError extends Error {},
}));

vi.mock('../config/client', () => ({
  queryClient: { invalidateQueries },
  useApiClient: () => ({}),
}));

vi.mock('@/components/ui/toast', () => ({ toast: { add: toastAdd } }));

vi.mock('@sentry/react', () => ({ captureException: sentryCapture }));

vi.mock('../env', () => ({ default: mockEnv }));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import {
  attemptSilentPasskeyUpgrade, browserSupportsConditionalGet, signalAllAcceptedPasskeys, signalUnknownPasskey,
} from './usePasskey';
// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import { snoozePasskeyPrompts } from './passkeySnooze';

function makeAuthApi() {
  return {
    preregisterPasskeyApiV1WebauthnPreregisterGet: vi.fn().mockResolvedValue({ challenge: 'c' }),
    registerPasskeyApiV1WebauthnRegisterPost: vi.fn().mockResolvedValue(undefined),
  };
}
type FakeAuthApi = ReturnType<typeof makeAuthApi>;
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test double narrowed to the two methods the function uses
const asAuthApi = (api: FakeAuthApi) => api as unknown as Parameters<typeof attemptSilentPasskeyUpgrade>[0];

afterEach(() => {
  window.localStorage.clear();
  webauthnSupported = true;
  webauthnAutofillSupported = false;
  mockEnv.VITE_FEATURE_SILENT_PASSKEY_UPGRADE = 'true';
  vi.clearAllMocks();
});

describe('attemptSilentPasskeyUpgrade', () => {
  it('does nothing when the feature flag is off', async () => {
    mockEnv.VITE_FEATURE_SILENT_PASSKEY_UPGRADE = 'false';
    const authApi = makeAuthApi();
    await attemptSilentPasskeyUpgrade(asAuthApi(authApi), 'u1');
    expect(authApi.preregisterPasskeyApiV1WebauthnPreregisterGet).not.toHaveBeenCalled();
  });

  it('fails closed when the flag is absent', async () => {
    mockEnv.VITE_FEATURE_SILENT_PASSKEY_UPGRADE = undefined;
    const authApi = makeAuthApi();
    await attemptSilentPasskeyUpgrade(asAuthApi(authApi), 'u1');
    expect(authApi.preregisterPasskeyApiV1WebauthnPreregisterGet).not.toHaveBeenCalled();
  });

  it('reports (but does not throw) when registration fails after the device created the credential', async () => {
    // Past a successful ceremony the OS holds a passkey the server does not
    // know about (orphan). This is the exact failure mode of the cookie race:
    // it must be reported, never swallowed.
    startRegistration.mockResolvedValue({ id: 'cred' });
    const authApi = makeAuthApi();
    authApi.registerPasskeyApiV1WebauthnRegisterPost.mockRejectedValue(new Error('400'));
    await expect(attemptSilentPasskeyUpgrade(asAuthApi(authApi), 'u1')).resolves.toBeUndefined();
    expect(sentryCapture).toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('registers silently and confirms with a toast on success', async () => {
    startRegistration.mockResolvedValue({ id: 'cred' });
    const authApi = makeAuthApi();
    await attemptSilentPasskeyUpgrade(asAuthApi(authApi), 'u1');
    // The conditional-create flag is what makes the ceremony invisible.
    expect(startRegistration).toHaveBeenCalledWith(
      expect.objectContaining({ useAutoRegister: true }),
    );
    expect(authApi.registerPasskeyApiV1WebauthnRegisterPost).toHaveBeenCalled();
    expect(toastAdd).toHaveBeenCalled();
  });

  it('does nothing when WebAuthn is unsupported', async () => {
    webauthnSupported = false;
    const authApi = makeAuthApi();
    await attemptSilentPasskeyUpgrade(asAuthApi(authApi), 'u1');
    expect(authApi.preregisterPasskeyApiV1WebauthnPreregisterGet).not.toHaveBeenCalled();
  });

  it('respects the per-account snooze', async () => {
    snoozePasskeyPrompts('u1');
    const authApi = makeAuthApi();
    await attemptSilentPasskeyUpgrade(asAuthApi(authApi), 'u1');
    expect(authApi.preregisterPasskeyApiV1WebauthnPreregisterGet).not.toHaveBeenCalled();
  });

  it('swallows a declined upgrade without any user-visible effect', async () => {
    // The browser declining (conditions not met / unsupported) is the normal
    // case and must stay invisible.
    startRegistration.mockRejectedValue(new Error('NotAllowedError'));
    const authApi = makeAuthApi();
    await expect(attemptSilentPasskeyUpgrade(asAuthApi(authApi), 'u1')).resolves.toBeUndefined();
    expect(authApi.registerPasskeyApiV1WebauthnRegisterPost).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
  });
});

describe('signalUnknownPasskey', () => {
  const opt = { challenge: 'c', rpId: 'bagadmenru.bzh' };
  const res = { id: 'cred-id-b64url' };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test doubles narrowed to the fields the helper reads
  const asArgs = () => [opt, res] as unknown as Parameters<typeof signalUnknownPasskey>;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('signals the provider with the rpId and credential id', async () => {
    const signal = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('PublicKeyCredential', { signalUnknownCredential: signal });
    await signalUnknownPasskey(...asArgs());
    expect(signal).toHaveBeenCalledWith({ rpId: 'bagadmenru.bzh', credentialId: 'cred-id-b64url' });
  });

  it('is a no-op when the browser lacks the Signal API', async () => {
    vi.stubGlobal('PublicKeyCredential', {});
    await expect(signalUnknownPasskey(...asArgs())).resolves.toBeUndefined();
  });

  it('is a no-op without a ceremony result or rpId', async () => {
    const signal = vi.fn();
    vi.stubGlobal('PublicKeyCredential', { signalUnknownCredential: signal });
    const [optArg, resArg] = asArgs();
    await signalUnknownPasskey(undefined, resArg);
    await signalUnknownPasskey(optArg, undefined);
    expect(signal).not.toHaveBeenCalled();
  });

  it('swallows a provider rejection (opportunistic sync)', async () => {
    const signal = vi.fn().mockRejectedValue(new Error('boom'));
    vi.stubGlobal('PublicKeyCredential', { signalUnknownCredential: signal });
    await expect(signalUnknownPasskey(...asArgs())).resolves.toBeUndefined();
  });
});

describe('signalAllAcceptedPasskeys', () => {
  const signal = {
    rpId: 'bagadmenru.bzh',
    userHandle: 'user-handle-b64url',
    remainingCredentialIds: ['kept-cred-b64url'],
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hands the provider the list of still-valid credentials', async () => {
    const signalAll = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('PublicKeyCredential', { signalAllAcceptedCredentials: signalAll });
    await signalAllAcceptedPasskeys(signal);
    expect(signalAll).toHaveBeenCalledWith({
      rpId: 'bagadmenru.bzh',
      userId: 'user-handle-b64url',
      allAcceptedCredentialIds: ['kept-cred-b64url'],
    });
  });

  it('is a no-op when the browser lacks the Signal API', async () => {
    vi.stubGlobal('PublicKeyCredential', {});
    await expect(signalAllAcceptedPasskeys(signal)).resolves.toBeUndefined();
  });

  it('swallows a provider rejection (opportunistic sync)', async () => {
    const signalAll = vi.fn().mockRejectedValue(new Error('boom'));
    vi.stubGlobal('PublicKeyCredential', { signalAllAcceptedCredentials: signalAll });
    await expect(signalAllAcceptedPasskeys(signal)).resolves.toBeUndefined();
  });
});

describe('browserSupportsConditionalGet', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('trusts getClientCapabilities().conditionalGet when available', async () => {
    vi.stubGlobal('PublicKeyCredential', {
      getClientCapabilities: async () => await Promise.resolve({ conditionalGet: true }),
    });
    await expect(browserSupportsConditionalGet()).resolves.toBe(true);

    vi.stubGlobal('PublicKeyCredential', {
      getClientCapabilities: async () => await Promise.resolve({ conditionalGet: false }),
    });
    await expect(browserSupportsConditionalGet()).resolves.toBe(false);
  });

  it('fails closed when the capability is not reported', async () => {
    vi.stubGlobal('PublicKeyCredential', {
      getClientCapabilities: async () => await Promise.resolve({}),
    });
    await expect(browserSupportsConditionalGet()).resolves.toBe(false);
  });

  it('falls back to isConditionalMediationAvailable on older browsers', async () => {
    vi.stubGlobal('PublicKeyCredential', {});
    webauthnAutofillSupported = true;
    await expect(browserSupportsConditionalGet()).resolves.toBe(true);
    webauthnAutofillSupported = false;
    await expect(browserSupportsConditionalGet()).resolves.toBe(false);
  });
});
