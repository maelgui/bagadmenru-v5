/**
 * Browser-side audit tracker: queues page views and clicks and ships them to
 * the backend in batches.
 *
 * Framework-free on purpose: it knows nothing about React, the router or the
 * API client. `src/config/audit.ts` wires it to the generated client and
 * `components/audit-tracker.tsx` feeds it from the DOM and the router. Audit
 * is best effort - a failed send drops the batch rather than retrying, so a
 * backend hiccup never piles up requests or surfaces to the member.
 */

export type ClientAuditKind = 'PAGE_VIEW' | 'CLICK';

export interface TrackedEvent {
  kind: ClientAuditKind;
  /** Low-cardinality label: route pattern, accessible name or data-audit id. */
  name: string;
  /** Concrete location the event happened on. */
  path: string;
  at: Date;
  details?: Record<string, unknown>;
}

/** `keepalive` asks the transport to outlive the page (pagehide flush). */
export type AuditSender = (events: TrackedEvent[], keepalive: boolean) => Promise<void>;

/**
 * Who is behind the events.
 * - `pending`: not known yet (auth probe in flight): queue, do not send, so the
 *   landing page view is not lost.
 * - `guest`: nobody signed in: record nothing and drop what was queued.
 * - `member`: send.
 */
export type AuditActorState = 'pending' | 'guest' | 'member';

export interface AuditTrackerOptions {
  flushIntervalMs?: number;
  maxBatch?: number;
  maxQueue?: number;
}

export interface AuditTracker {
  track: (kind: ClientAuditKind, name: string, path: string, details?: Record<string, unknown>) => void;
  flush: (keepalive?: boolean) => Promise<void>;
  setActor: (state: AuditActorState) => void;
  /** Queued, not yet sent. */
  readonly size: number;
}

// Mirrors the backend schema bounds (schemas/audit.py).
const MAX_NAME_LENGTH = 200;
const MAX_PATH_LENGTH = 2000;
const DEFAULT_FLUSH_INTERVAL_MS = 5000;
const DEFAULT_MAX_BATCH = 50;
const DEFAULT_MAX_QUEUE = 500;

export function createAuditTracker(send: AuditSender, options: AuditTrackerOptions = {}): AuditTracker {
  const flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
  const maxBatch = options.maxBatch ?? DEFAULT_MAX_BATCH;
  const maxQueue = options.maxQueue ?? DEFAULT_MAX_QUEUE;

  let queue: TrackedEvent[] = [];
  let actor: AuditActorState = 'pending';
  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule() {
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, flushIntervalMs);
  }

  async function flush(keepalive = false): Promise<void> {
    if (actor !== 'member' || queue.length === 0) return;
    clearTimer();
    const batch = queue.splice(0, maxBatch);
    try {
      await send(batch, keepalive);
    } catch {
      // Best effort: the batch is dropped, never retried.
    }
    if (queue.length > 0) schedule();
  }

  function track(kind: ClientAuditKind, name: string, path: string, details?: Record<string, unknown>) {
    if (actor === 'guest') return;
    queue.push({
      kind,
      name: name.slice(0, MAX_NAME_LENGTH),
      path: path.slice(0, MAX_PATH_LENGTH),
      at: new Date(),
      details,
    });
    // Bounded memory: under a flood (or while pending) keep the newest.
    if (queue.length > maxQueue) queue.splice(0, queue.length - maxQueue);
    if (actor !== 'member') return;
    if (queue.length >= maxBatch) {
      void flush();
    } else {
      schedule();
    }
  }

  function setActor(state: AuditActorState) {
    actor = state;
    if (state === 'guest') {
      queue = [];
      clearTimer();
    } else if (state === 'member' && queue.length > 0) {
      schedule();
    }
  }

  return {
    track,
    flush,
    setActor,
    get size() {
      return queue.length;
    },
  };
}
