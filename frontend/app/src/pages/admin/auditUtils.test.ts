import { describe, expect, it } from 'vitest';
import { AuditKind, type AuditEvent } from 'bagad-client';
import {
  isPeriod, isScope, outcomeOf, periodSince, scopeParams, shownPath, statusTone,
} from './auditUtils';

describe('scopeParams', () => {
  it('maps each scope to the server filters', () => {
    expect(scopeParams('all')).toEqual({});
    expect(scopeParams('mutations')).toEqual({ kind: AuditKind.ApiCall, mutationsOnly: true });
    expect(scopeParams('api')).toEqual({ kind: AuditKind.ApiCall });
    expect(scopeParams('pages')).toEqual({ kind: AuditKind.PageView });
    expect(scopeParams('clicks')).toEqual({ kind: AuditKind.Click });
    expect(scopeParams('actions')).toEqual({ kind: AuditKind.Action });
  });

  it('guards unknown values', () => {
    expect(isScope('pages')).toBe(true);
    expect(isScope('nope')).toBe(false);
    expect(isPeriod('7d')).toBe(true);
    expect(isPeriod('1y')).toBe(false);
  });
});

describe('periodSince', () => {
  const now = new Date('2026-10-31T12:00:00Z');

  it('subtracts the period from now', () => {
    expect(periodSince('24h', now)?.toISOString()).toBe('2026-10-30T12:00:00.000Z');
    expect(periodSince('7d', now)?.toISOString()).toBe('2026-10-24T12:00:00.000Z');
  });

  it('is unbounded for "all"', () => {
    expect(periodSince('all', now)).toBeUndefined();
  });
});

describe('statusTone', () => {
  it('buckets HTTP statuses', () => {
    expect(statusTone(200)).toBe('ok');
    expect(statusTone(302)).toBe('ok');
    expect(statusTone(403)).toBe('client-error');
    expect(statusTone(500)).toBe('server-error');
  });
});

describe('shownPath', () => {
  const api = (name: string, path: string): AuditEvent => ({
    id: 1, at: new Date(), kind: AuditKind.ApiCall, method: 'GET', name, path,
  });

  it('hides an API path that only repeats the pattern', () => {
    expect(shownPath(api('GET /api/v1/profiles/me', '/api/v1/profiles/me'))).toBeNull();
  });

  it('shows an API path carrying parameters or a query string', () => {
    expect(shownPath(api('GET /api/v1/events/{event_id}', '/api/v1/events/42'))).toBe('/api/v1/events/42');
    expect(shownPath(api('GET /api/v1/files/', '/api/v1/files/?t=FILE'))).toBe('/api/v1/files/?t=FILE');
  });

  it('shows a page path only when the route had parameters', () => {
    const view = (name: string, path: string): AuditEvent => ({
      id: 1, at: new Date(), kind: AuditKind.PageView, name, path,
    });
    expect(shownPath(view('/events', '/events'))).toBeNull();
    expect(shownPath(view('/profile/:profileId', '/profile/abc'))).toBe('/profile/abc');
  });

  it('always names the page a click or action happened on', () => {
    expect(shownPath({
      id: 1, at: new Date(), kind: AuditKind.Action, name: 'passkey.register', path: '/profile/settings',
    })).toBe('/profile/settings');
  });
});

describe('outcomeOf', () => {
  const action = (details?: Record<string, unknown>): AuditEvent => ({
    id: 1, at: new Date(), kind: AuditKind.Action, name: 'passkey.register', path: '/x', details,
  });

  it('reads a string outcome from details', () => {
    expect(outcomeOf(action({ outcome: 'failed', error: 'NotAllowedError' }))).toBe('failed');
  });

  it('is null without one', () => {
    expect(outcomeOf(action())).toBeNull();
    expect(outcomeOf(action({ outcome: 3 }))).toBeNull();
  });
});
