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
      // Carried through to notificationclick so an action button can answer
      // the event RSVP directly. Present only for new-event notifications.
      eventId: data.eventId,
      rsvpToken: data.rsvpToken,
    },
    vibrate: [200, 100, 200],
    tag: 'bagadmenru-notification',
    renotify: true,
  };

  // When the push carries an RSVP quick-answer token, offer "Présent" /
  // "Absent" action buttons so the recipient can answer straight from the
  // notification without opening the app. The token authorizes the write, so
  // no session is needed (the service worker has no login context).
  if (data.rsvpToken && typeof data.eventId !== 'undefined') {
    options.actions = [
      { action: 'rsvp-present', title: 'Présent' },
      { action: 'rsvp-absent', title: 'Absent' },
    ];
  }

  // Update the installed PWA icon badge with the recipient's number of
  // unanswered doodle events (sent by the backend in the push payload). This
  // works even while the app is closed.
  //
  // The Badging API is exposed on `navigator` (WorkerNavigator) inside a
  // service worker, NOT on `self.registration`. Using the registration silently
  // no-ops, so the badge would never update when a push arrives. Feature-
  // detected and non-blocking: failures must not prevent the notification from
  // showing.
  const applyBadge = (async () => {
    if (typeof data.badgeCount !== 'number' || !('setAppBadge' in navigator)) {
      return;
    }
    try {
      if (data.badgeCount > 0) {
        await navigator.setAppBadge(data.badgeCount);
      } else {
        await navigator.clearAppBadge();
      }
    } catch (e) {
      // Badging is a non-critical enhancement; ignore failures.
    }
  })();

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'Bagad Men Ru', options),
      applyBadge,
    ])
  );
});

// The API base URL is passed as a query parameter at registration time (see
// main.tsx). The service worker runs without a page context, so we use an
// explicit absolute base rather than relying on relative resolution.
function getApiUrl() {
  return new URL(self.location.href).searchParams.get('apiUrl') || '';
}

// Record an event RSVP using the quick-answer token carried in the push
// payload. Resolves regardless of outcome so notification handling never
// rejects; failures are logged only.
async function submitRsvp(token, value) {
  try {
    await fetch(`${getApiUrl()}/api/v1/responses/link/save`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        token,
      },
      body: JSON.stringify({ value }),
    });
  } catch (e) {
    // Non-critical: the user can still answer from the app.
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};

  // Action-button clicks (Présent / Absent) answer the RSVP in place and, for
  // a valid answer, refresh the app badge. They do not open a window.
  if (event.action === 'rsvp-present' || event.action === 'rsvp-absent') {
    const { rsvpToken } = notificationData;
    if (!rsvpToken) {
      return;
    }
    const value = event.action === 'rsvp-present';
    event.waitUntil(submitRsvp(rsvpToken, value));
    return;
  }

  const url = notificationData.url || '/';

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
  const apiUrl = getApiUrl();

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
