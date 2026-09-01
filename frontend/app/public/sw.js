/* eslint-disable no-restricted-globals */

// Service Worker for Push Notifications

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = JSON.parse(event.data.text());
    } catch (e) {
      data = { title: 'Nouvelle notification', body: 'Vous avez une nouvelle notification.' };
    }
  }

  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/logov2.svg',
    badge: '/logov2.svg',
    data: {
      url: data.url || '/',
    },
    vibrate: [200, 100, 200],
    tag: 'bagadmenru-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Bagad Men Ru', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // The API base URL is passed as a query parameter at registration time
  // (see main.tsx): the API lives on a different origin in beta/prod, so a
  // relative fetch from the service worker would hit the frontend host.
  const apiUrl = new URL(self.location.href).searchParams.get('apiUrl') || '';

  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options).then((subscription) => {
      const p256dh = btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh'))))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const auth = btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      return fetch(`${apiUrl}/api/v1/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh,
          auth,
        }),
      });
    })
  );
});
