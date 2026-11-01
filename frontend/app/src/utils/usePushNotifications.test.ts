// @vitest-environment jsdom
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

const { auditAction, subscribePost } = vi.hoisted(() => ({ auditAction: vi.fn(), subscribePost: vi.fn() }));

vi.mock('../config/audit', () => ({ auditAction }));
vi.mock('../config/client', () => ({
  useApiClient: () => ({ pushApi: { subscribeApiV1PushSubscribePost: subscribePost } }),
}));

// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import { renderHook } from '@testing-library/react';
// eslint-disable-next-line import/first -- import must follow vi.mock hoisting
import { subscriptionMatchesServerKey, usePushNotifications } from './usePushNotifications';

/** Build a fake PushSubscription carrying the given applicationServerKey bytes. */
function fakeSubscription(key: ArrayBuffer | null): PushSubscription {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal fake: the helper only reads options.applicationServerKey
  return { options: { applicationServerKey: key } } as unknown as PushSubscription;
}

/** Decode a base64url string into an ArrayBuffer (inverse of the helper). */
function base64urlToBuffer(value: string): ArrayBuffer {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// A realistic P-256 uncompressed-point VAPID public key (base64url, no padding).
// Public key, not a secret — gitleaks:allow
const SERVER_KEY = 'BEibjIo7p3zTBbEJc2Oywfvxe655TUTH-cklnkx0dPtAN2FktdtDEJV91xMrCdEbMaNBupoB699ENzTC3zr_ZWM';

describe('enableThisDevice', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('journals a refused permission, which no API call would show', async () => {
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: async () => await Promise.resolve('denied') });
    Object.defineProperty(navigator, 'serviceWorker', { value: { ready: Promise.resolve({ pushManager: { getSubscription: async () => await Promise.resolve(null) } }) }, configurable: true });
    // Only its presence is checked ('PushManager' in window).
    vi.stubGlobal('PushManager', {});

    const { result } = renderHook(() => usePushNotifications());
    await expect(result.current.enableThisDevice()).resolves.toBe(false);
    expect(auditAction).toHaveBeenCalledWith('push.permission', { outcome: 'denied' });
    expect(subscribePost).not.toHaveBeenCalled();
  });
});

describe('subscriptionMatchesServerKey', () => {
  it('matches a subscription bound to the current server key', () => {
    const sub = fakeSubscription(base64urlToBuffer(SERVER_KEY));
    expect(subscriptionMatchesServerKey(sub, SERVER_KEY)).toBe(true);
  });

  it('rejects a subscription bound to a rotated-away key', () => {
    // Same key with the last byte flipped — a different keypair.
    const buffer = base64urlToBuffer(SERVER_KEY);
    const bytes = new Uint8Array(buffer);
    bytes[bytes.length - 1] ^= 0xff;
    const sub = fakeSubscription(buffer);
    expect(subscriptionMatchesServerKey(sub, SERVER_KEY)).toBe(false);
  });

  it('rejects a subscription without an applicationServerKey', () => {
    expect(subscriptionMatchesServerKey(fakeSubscription(null), SERVER_KEY)).toBe(false);
  });
});
