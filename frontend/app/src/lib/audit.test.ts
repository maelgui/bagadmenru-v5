import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuditTracker, type TrackedEvent } from './audit';

describe('createAuditTracker', () => {
  let sent: Array<{ events: TrackedEvent[]; keepalive: boolean }> = [];
  const send = vi.fn(async (events: TrackedEvent[], keepalive: boolean) => {
    sent.push({ events, keepalive });
    await Promise.resolve();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    send.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('batches events and flushes after the interval once the actor is a member', async () => {
    const tracker = createAuditTracker(send, { flushIntervalMs: 1000 });
    tracker.setActor('member');
    tracker.track('PAGE_VIEW', '/events', '/events');
    tracker.track('CLICK', 'Enregistrer', '/events', { tag: 'button' });
    expect(send).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(send).toHaveBeenCalledTimes(1);
    expect(sent[0].keepalive).toBe(false);
    expect(sent[0].events.map((e) => [e.kind, e.name])).toEqual([
      ['PAGE_VIEW', '/events'],
      ['CLICK', 'Enregistrer'],
    ]);
    expect(sent[0].events[1].details).toEqual({ tag: 'button' });
    expect(tracker.size).toBe(0);
  });

  it('flushes immediately when a batch is full', async () => {
    const tracker = createAuditTracker(send, { maxBatch: 2, flushIntervalMs: 60_000 });
    tracker.setActor('member');
    tracker.track('CLICK', 'a', '/');
    tracker.track('CLICK', 'b', '/');
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('queues while the actor is pending and sends once it is a member', async () => {
    const tracker = createAuditTracker(send, { flushIntervalMs: 1000 });
    tracker.track('PAGE_VIEW', '/', '/');
    await vi.advanceTimersByTimeAsync(5000);
    expect(send).not.toHaveBeenCalled();
    expect(tracker.size).toBe(1);

    tracker.setActor('member');
    await vi.advanceTimersByTimeAsync(1000);
    expect(send).toHaveBeenCalledTimes(1);
    expect(sent[0].events[0].name).toBe('/');
  });

  it('records nothing for a guest and drops what was queued', async () => {
    const tracker = createAuditTracker(send, { flushIntervalMs: 1000 });
    tracker.track('PAGE_VIEW', '/auth/login', '/auth/login');
    tracker.setActor('guest');
    tracker.track('CLICK', 'Se connecter', '/auth/login');
    await vi.advanceTimersByTimeAsync(5000);
    expect(send).not.toHaveBeenCalled();
    expect(tracker.size).toBe(0);
  });

  it('passes keepalive through on an explicit flush', async () => {
    const tracker = createAuditTracker(send);
    tracker.setActor('member');
    tracker.track('CLICK', 'x', '/');
    await tracker.flush(true);
    expect(sent[0].keepalive).toBe(true);
  });

  it('drops a batch the backend refuses instead of retrying', async () => {
    const failing = vi.fn(async () => {
      await Promise.resolve();
      throw new Error('401');
    });
    const tracker = createAuditTracker(failing, { flushIntervalMs: 1000 });
    tracker.setActor('member');
    tracker.track('CLICK', 'x', '/');
    await vi.advanceTimersByTimeAsync(1000);
    expect(failing).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(failing).toHaveBeenCalledTimes(1);
    expect(tracker.size).toBe(0);
  });

  it('keeps only the newest events past the queue bound', () => {
    const tracker = createAuditTracker(send, { maxQueue: 2 });
    tracker.track('CLICK', 'a', '/');
    tracker.track('CLICK', 'b', '/');
    tracker.track('CLICK', 'c', '/');
    expect(tracker.size).toBe(2);
  });

  it('clips names and paths to the backend bounds', async () => {
    const tracker = createAuditTracker(send);
    tracker.setActor('member');
    tracker.track('CLICK', 'x'.repeat(300), '/');
    await tracker.flush();
    expect(sent[0].events[0].name).toHaveLength(200);
  });
});
