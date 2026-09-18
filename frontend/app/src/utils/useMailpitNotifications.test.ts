// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import { toast } from '@/components/ui/toast';
import { parseNewMailEvent, useMailpitNotifications } from './useMailpitNotifications';

vi.mock('@/components/ui/toast', () => ({ toast: { add: vi.fn() } }));

/** Minimal WebSocket stand-in: records instances, lets tests fire handlers. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  url: string;

  onopen: (() => void) | null = null;

  onmessage: ((event: { data: string }) => void) | null = null;

  onclose: (() => void) | null = null;

  close = vi.fn();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
}

const NEW_MAIL_EVENT = JSON.stringify({
  Type: 'new',
  Data: {
    ID: '4b9dDiEbzQqXQucNr8aU5F',
    Subject: 'Votre code de connexion',
    To: [{ Name: '', Address: 'e2e@bagadmenru.bzh' }],
  },
});

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('parseNewMailEvent', () => {
  it('extracts subject and recipients from a "new" event', () => {
    expect(parseNewMailEvent(NEW_MAIL_EVENT)).toEqual({
      Subject: 'Votre code de connexion',
      To: [{ Name: '', Address: 'e2e@bagadmenru.bzh' }],
    });
  });

  it('ignores other event types and malformed frames', () => {
    expect(parseNewMailEvent(JSON.stringify({ Type: 'stats', Data: { Total: 2 } }))).toBeNull();
    expect(parseNewMailEvent('not json')).toBeNull();
    expect(parseNewMailEvent('42')).toBeNull();
  });
});

describe('useMailpitNotifications', () => {
  it('does not connect when disabled', () => {
    renderHook(() => useMailpitNotifications(false));
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it('counts new mails and raises a toast', () => {
    const { result } = renderHook(() => useMailpitNotifications(true));
    const [socket] = FakeWebSocket.instances;

    act(() => {
      socket.onopen?.();
      socket.onmessage?.({ data: NEW_MAIL_EVENT });
      socket.onmessage?.({ data: JSON.stringify({ Type: 'stats', Data: { Total: 3 } }) });
    });

    expect(result.current).toBe(1);
    expect(toast.add).toHaveBeenCalledTimes(1);
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Nouveau mail : Votre code de connexion',
      description: 'À e2e@bagadmenru.bzh',
    }));
  });

  it('reconnects after an established connection drops', () => {
    renderHook(() => useMailpitNotifications(true));
    const [socket] = FakeWebSocket.instances;

    act(() => {
      socket.onopen?.();
      socket.onclose?.();
      vi.runOnlyPendingTimers();
    });

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('gives up silently when the connection never opens', () => {
    renderHook(() => useMailpitNotifications(true));
    const [socket] = FakeWebSocket.instances;

    act(() => {
      socket.onclose?.(); // failed without ever opening (403/404)
      vi.runOnlyPendingTimers();
    });

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(toast.add).not.toHaveBeenCalled();
  });

  it('closes the socket on unmount', () => {
    const { unmount } = renderHook(() => useMailpitNotifications(true));
    const [socket] = FakeWebSocket.instances;

    unmount();

    expect(socket.close).toHaveBeenCalled();
  });
});
