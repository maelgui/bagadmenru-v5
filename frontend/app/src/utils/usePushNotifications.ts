import { useCallback, useEffect, useState } from 'react';
import { useApiClient } from '../config/client';

export type PushNotificationStatus = 'unsupported' | 'denied' | 'granted' | 'default';

function getInitialStatus(): PushNotificationStatus {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

async function getBrowserSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}

/**
 * Whether a browser push subscription is bound to the given VAPID public key.
 *
 * After a server-side VAPID key rotation, existing browser subscriptions stay
 * bound to the OLD key: the backend can no longer push to them (403, pruned
 * server-side) and re-registering the same subscription would be useless. A
 * mismatch means the subscription must be dropped and recreated.
 */
export function subscriptionMatchesServerKey(
  subscription: PushSubscription,
  serverPublicKey: string,
): boolean {
  const raw = subscription.options.applicationServerKey;
  if (!raw) {
    return false;
  }
  let binary = '';
  for (const byte of new Uint8Array(raw)) {
    binary += String.fromCharCode(byte);
  }
  const base64url = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64url === serverPublicKey;
}

// Matches the backend fingerprint (`_device_hash`): SHA-256 hex truncated to
// this many chars. 64 bits is ample to distinguish one user's devices.
const DEVICE_HASH_LEN = 16;
const HEX_RADIX = 16;
const HEX_PAD = 2;

/**
 * Non-reversible fingerprint of a push endpoint, matching the backend
 * (`_device_hash`). Lets the UI recognise which listed device is "this device"
 * without the endpoint being exposed.
 */
async function hashEndpoint(endpoint: string): Promise<string> {
  const data = new TextEncoder().encode(endpoint);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(HEX_RADIX).padStart(HEX_PAD, '0'))
    .join('')
    .slice(0, DEVICE_HASH_LEN);
}

/**
 * Device-centric push notifications. The source of truth for "is this device
 * subscribed?" is the backend device list (matched by endpoint hash), not a
 * fragile local flag. This hook only exposes the browser-side primitives:
 * capability/permission status, the current device's endpoint hash, and the
 * register/unregister actions. The device list owns the server state.
 */
export function usePushNotifications() {
  const [status, setStatus] = useState<PushNotificationStatus>(getInitialStatus);
  const [thisDeviceHash, setThisDeviceHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { pushApi } = useApiClient();

  /** Compute this browser's device hash, or null if not subscribed. */
  const computeThisDeviceHash = useCallback(async (): Promise<string | null> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }
    const subscription = await getBrowserSubscription();
    return subscription ? await hashEndpoint(subscription.endpoint) : null;
  }, []);

  const refreshThisDeviceHash = useCallback(async () => {
    const hash = await computeThisDeviceHash();
    setThisDeviceHash(hash);
  }, [computeThisDeviceHash]);

  useEffect(() => {
    let cancelled = false;
    computeThisDeviceHash().then((hash) => {
      if (!cancelled) {
        setThisDeviceHash(hash);
      }
    }).catch(() => { /* capability check only; ignore */ });
    return () => {
      cancelled = true;
    };
  }, [computeThisDeviceHash]);

  /**
   * Enable push on this device: request permission (needs a user gesture),
   * create the browser subscription if missing, then register it with the
   * backend so notifications can be delivered. Returns whether it succeeded.
   */
  const enableThisDevice = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission);
      if (permission !== 'granted') {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      const { publicKey } = await pushApi.getVapidPublicKeyApiV1PushVapidPublicKeyGet();
      if (subscription && !subscriptionMatchesServerKey(subscription, publicKey)) {
        // Bound to a rotated-away VAPID key: the backend can never deliver to
        // it again. Drop it so a fresh subscription is created under the
        // current key.
        await subscription.unsubscribe();
        subscription = null;
      }
      subscription ??= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      const { keys } = subscription.toJSON();
      await pushApi.subscribeApiV1PushSubscribePost({
        pushSubscriptionCreate: {
          endpoint: subscription.endpoint,
          p256dh: keys?.p256dh ?? '',
          auth: keys?.auth ?? '',
        },
      });

      setThisDeviceHash(await hashEndpoint(subscription.endpoint));
      return true;
    } catch (error) {
      console.error('Failed to enable push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pushApi]);

  /**
   * Tear down the browser subscription for this device. Idempotent: safe to
   * call even if the backend row is already gone (e.g. the device was removed
   * from the list). The backend row, if any, is removed by the caller via the
   * device id; here we only clean up the browser side.
   */
  const unsubscribeBrowser = useCallback(async () => {
    const subscription = await getBrowserSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
    setThisDeviceHash(null);
  }, []);

  return {
    status,
    isLoading,
    isSupported: status !== 'unsupported',
    thisDeviceHash,
    enableThisDevice,
    unsubscribeBrowser,
    refreshThisDeviceHash,
  };
}
