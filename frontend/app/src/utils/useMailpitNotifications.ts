import { useEffect, useState } from 'react';

import { toast } from '@/components/ui/toast';

/**
 * Live "new mail" notifications from Mailpit, for the debug bar.
 *
 * Subscribes to Mailpit's own live-update websocket (`/_mail/api/events`,
 * same-origin in every environment where the debug bar renders: beta and
 * review apps behind the /_mail ingress, local compose behind the vite
 * proxy). Every `Type: "new"` event raises an info toast with the subject
 * and recipients and increments the returned counter; other event types
 * (`stats`, `update`, ...) are ignored.
 *
 * Failure policy: if the socket never manages to open, the condition is
 * permanent for this page load (no Mailpit behind /_mail — bare `yarn dev` —
 * or a 403 from the beta forwardAuth for a session without VIEW:EMAIL) and
 * we give up silently. If an established connection drops (vite restart,
 * pod roll), we reconnect after a short delay.
 *
 * @returns number of mails received since the page was loaded.
 */

interface MailpitAddress {
  Address: string;
}

interface MailpitNewMailData {
  Subject: string;
  To: MailpitAddress[];
}

const RECONNECT_DELAY_MS = 5000;

function isMailpitAddress(value: unknown): value is MailpitAddress {
  return typeof value === 'object'
    && value !== null
    && 'Address' in value
    && typeof value.Address === 'string';
}

/** Parse a raw websocket frame into new-mail data, or null for other events. */
export function parseNewMailEvent(raw: string): MailpitNewMailData | null {
  try {
    const event: unknown = JSON.parse(raw);
    if (typeof event !== 'object' || event === null) return null;
    const { Type, Data } = event as { Type?: unknown; Data?: unknown };
    if (Type !== 'new' || typeof Data !== 'object' || Data === null) return null;
    const { Subject, To } = Data as { Subject?: unknown; To?: unknown };
    return {
      Subject: typeof Subject === 'string' ? Subject : '(sans sujet)',
      To: Array.isArray(To) ? To.filter(isMailpitAddress) : [],
    };
  } catch {
    return null;
  }
}

function notify(mail: MailpitNewMailData) {
  const recipients = mail.To.map((to) => to.Address).join(', ');
  toast.add({
    title: `Nouveau mail : ${mail.Subject}`,
    description: recipients !== '' ? `À ${recipients}` : undefined,
    type: 'info',
    actionProps: {
      children: 'Ouvrir Mailpit',
      onClick: () => { window.open('/_mail/', '_blank', 'noopener'); },
    },
  });
}

export function useMailpitNotifications(enabled: boolean): number {
  const [mailCount, setMailCount] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;

    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${scheme}://${window.location.host}/_mail/api/events`);
      let opened = false;

      socket.onopen = () => { opened = true; };

      socket.onmessage = (event: MessageEvent<string>) => {
        const mail = parseNewMailEvent(event.data);
        if (mail !== null) {
          setMailCount((count) => count + 1);
          notify(mail);
        }
      };

      // onclose fires for failed connections too (after onerror), so all the
      // teardown logic lives here.
      socket.onclose = () => {
        if (disposed || !opened) return;
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [enabled]);

  return mailCount;
}
