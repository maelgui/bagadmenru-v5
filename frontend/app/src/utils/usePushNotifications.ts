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

export function usePushNotifications() {
  const [status, setStatus] = useState<PushNotificationStatus>(getInitialStatus);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { pushApi } = useApiClient();

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    // Check if the browser already holds a push subscription
    void getBrowserSubscription().then((subscription) => {
      setIsSubscribed(subscription !== null);
    });
  }, []);

  /**
   * Local preparation only: asks for permission (requires a user gesture) and
   * creates the browser push subscription. Nothing is sent to the backend, so
   * no notification can be delivered yet. Returns whether preparation succeeded.
   */
  const prepare = useCallback(async (): Promise<boolean> => {
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
      const existing = await registration.pushManager.getSubscription();
      if (!existing) {
        const { publicKey } = await pushApi.getVapidPublicKeyApiV1PushVapidPublicKeyGet();
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        });
      }

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Failed to prepare push notifications:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [pushApi]);

  /**
   * Registers the prepared browser subscription with the backend.
   * This is the step that actually enables notification delivery.
   */
  const enable = useCallback(async () => {
    const subscription = await getBrowserSubscription();
    if (!subscription) {
      throw new Error('No browser push subscription to register');
    }

    const { keys } = subscription.toJSON();
    await pushApi.subscribeApiV1PushSubscribePost({
      pushSubscriptionCreate: {
        endpoint: subscription.endpoint,
        p256dh: keys?.p256dh ?? '',
        auth: keys?.auth ?? '',
      },
    });
  }, [pushApi]);

  /**
   * Removes the subscription from the backend and the browser.
   */
  const disable = useCallback(async () => {
    const subscription = await getBrowserSubscription();
    if (!subscription) {
      setIsSubscribed(false);
      return;
    }

    const { keys } = subscription.toJSON();
    await pushApi.unsubscribeApiV1PushUnsubscribeDelete({
      pushSubscriptionCreate: {
        endpoint: subscription.endpoint,
        p256dh: keys?.p256dh ?? '',
        auth: keys?.auth ?? '',
      },
    });

    await subscription.unsubscribe();
    setIsSubscribed(false);
  }, [pushApi]);

  return {
    status,
    isSubscribed,
    isLoading,
    isSupported: status !== 'unsupported',
    prepare,
    enable,
    disable,
  };
}
