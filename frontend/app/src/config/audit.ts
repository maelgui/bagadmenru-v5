import { AuditKind, type ClientAuditEvent } from 'bagad-client';
import { createAuditTracker, type TrackedEvent } from '@/lib/audit';
import { apiClient } from './client';

const KIND: Record<TrackedEvent['kind'], AuditKind> = {
  PAGE_VIEW: AuditKind.PageView,
  CLICK: AuditKind.Click,
  ACTION: AuditKind.Action,
};

function toClientEvent(event: TrackedEvent): ClientAuditEvent {
  return {
    kind: KIND[event.kind],
    name: event.name,
    path: event.path,
    at: event.at,
    details: event.details ?? null,
  };
}

/**
 * The app's single audit tracker, shipping batches through the generated
 * client. `keepalive` lets the last flush on pagehide outlive the page.
 */
export const audit = createAuditTracker(async (events, keepalive) => {
  await apiClient.auditApi.ingestClientEventsApiV1AuditEventsPost(
    { clientAuditBatch: { events: events.map(toClientEvent) } },
    { keepalive },
  );
});

/**
 * Report a browser-side step the API never sees on its own: the outcome of a
 * passkey ceremony, a notification permission prompt... `name` is a stable
 * dotted id (`passkey.register`); put the outcome in `details`.
 */
export function auditAction(name: string, details?: Record<string, unknown>) {
  audit.track('ACTION', name, window.location.pathname, details);
}
