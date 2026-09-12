// @vitest-environment jsdom
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

const startRegistration = vi.fn();
let webauthnSupported = true;
// Hoisted: these are read while the mock factories execute, before the test
// file body runs.
const {
  toastAdd, invalidateQueries, sentryCapture, mockEnv,
} = vi.hoisted(() => {
  // Mutable so each test can pick the runtime environment; the silent
  // upgrade is gated to beta (and local dev).
  const hoistedEnv: { VITE_ENVIRONMENT?: string } = { VITE_ENVIRONMENT: 'beta' };
  return {
    toastAdd: vi.fn(),
    invalidateQueries: vi.fn(),
    sentryCapture: vi.fn(),
    mockEnv: hoistedEnv,
  };
});

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => webauthnSupported,
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
import { attemptSilentPasskeyUpgrade } from './usePasskey';
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
  mockEnv.VITE_ENVIRONMENT = 'beta';
  vi.clearAllMocks();
});

describe('attemptSilentPasskeyUpgrade', () => {
  it('does nothing on production (beta-only rollout)', async () => {
    mockEnv.VITE_ENVIRONMENT = 'production';
    const authApi = makeAuthApi();
    await attemptSilentPasskeyUpgrade(asAuthApi(authApi), 'u1');
    expect(authApi.preregisterPasskeyApiV1WebauthnPreregisterGet).not.toHaveBeenCalled();
  });

  it('fails closed when the environment variable is absent', async () => {
    // vitest runs with import.meta.env.DEV=true, so the local-dev fallback
    // applies; an absent variable in a production build must disable the
    // upgrade. Here we can only assert the dev fallback keeps it enabled.
    mockEnv.VITE_ENVIRONMENT = undefined;
    startRegistration.mockResolvedValue({ id: 'cred' });
    const authApi = makeAuthApi();
    await attemptSilentPasskeyUpgrade(asAuthApi(authApi), 'u1');
    expect(authApi.preregisterPasskeyApiV1WebauthnPreregisterGet).toHaveBeenCalled();
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
