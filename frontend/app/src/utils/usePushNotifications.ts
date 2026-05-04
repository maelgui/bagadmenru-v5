import { useCallback, useEffect, useState } from 'react';
import env from '../env';

/**
 * Converts a base64 URL-safe string to a Uint8Array (for applicationServerKey)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Converts an ArrayBuffer to a URL-safe base64 string (no padding)
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return window.btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export type PushNotificationStatus = 'unsupported' | 'denied' | 'granted' | 'default' | 'loading';

export function usePushNotifications() {
  const [status, setStatus] = useState<PushNotificationStatus>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const apiUrl = env.VITE_BBE2_API_URL || '';

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    // Check current permission status
    const { permission } = Notification;
    setStatus(permission as PushNotificationStatus);

    // Check if already subscribed
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((subscription) => {
        setIsSubscribed(subscription !== null);
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setStatus(permission as PushNotificationStatus);

      if (permission !== 'granted') {
        setIsLoading(false);
        return;
      }

      // Get VAPID public key from server
      const vapidResponse = await fetch(`${apiUrl}/api/v1/push/vapid-public-key`, {
        credentials: 'include',
      });
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID public key');
      }
      const { public_key: vapidPublicKey } = await vapidResponse.json();

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Send subscription to server
      const p256dh = arrayBufferToBase64Url(subscription.getKey('p256dh'));
      const auth = arrayBufferToBase64Url(subscription.getKey('auth'));

      const response = await fetch(`${apiUrl}/api/v1/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register subscription on server');
      }

      setIsSubscribed(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to subscribe to push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  const unsubscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const p256dh = arrayBufferToBase64Url(subscription.getKey('p256dh'));
        const auth = arrayBufferToBase64Url(subscription.getKey('auth'));

        // Unsubscribe from server
        await fetch(`${apiUrl}/api/v1/push/unsubscribe`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            p256dh,
            auth,
          }),
        });

        // Unsubscribe from browser
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to unsubscribe from push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  return {
    status,
    isSubscribed,
    isLoading,
    isSupported: status !== 'unsupported',
    subscribe,
    unsubscribe,
  };
}
