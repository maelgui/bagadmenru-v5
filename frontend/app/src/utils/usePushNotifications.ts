import { useCallback, useEffect, useState } from 'react';
import type { PushNotificationsApi } from 'bagad-client';
import { useApiClient } from '../config/client';

export type PushNotificationStatus = 'unsupported' | 'denied' | 'granted' | 'default';

function getInitialStatus(): PushNotificationStatus {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

async function registerPushSubscription(vapidPublicKey: string, pushApi: PushNotificationsApi) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidPublicKey,
  });

  const { keys } = subscription.toJSON();
  await pushApi.subscribeApiV1PushSubscribePost({
    pushSubscriptionCreate: {
      endpoint: subscription.endpoint,
      p256dh: keys?.p256dh ?? '',
      auth: keys?.auth ?? '',
    },
  });
}

async function removePushSubscription(subscription: PushSubscription, pushApi: PushNotificationsApi) {
  const { keys } = subscription.toJSON();

  await pushApi.unsubscribeApiV1PushUnsubscribeDelete({
    pushSubscriptionCreate: {
      endpoint: subscription.endpoint,
      p256dh: keys?.p256dh ?? '',
      auth: keys?.auth ?? '',
    },
  });

  await subscription.unsubscribe();
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

    // Check if already subscribed
    void navigator.serviceWorker.ready.then((registration) => {
      void registration.pushManager.getSubscription().then((subscription) => {
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
      const permission = await Notification.requestPermission();
      setStatus(permission);

      if (permission !== 'granted') {
        return;
      }

      const { publicKey: vapidPublicKey } = await pushApi.getVapidPublicKeyApiV1PushVapidPublicKeyGet();
      await registerPushSubscription(vapidPublicKey, pushApi);
      setIsSubscribed(true);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pushApi]);

  const unsubscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await removePushSubscription(subscription, pushApi);
      }

      setIsSubscribed(false);
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [pushApi]);

  return {
    status,
    isSubscribed,
    isLoading,
    isSupported: status !== 'unsupported',
    subscribe,
    unsubscribe,
  };
}
