import { describe, expect, it } from 'vitest';
import { AuditKind, type AuditEvent } from 'bagad-client';
import {
  isMutation, isPeriod, isScope, periodSince, scopeParams, statusTone,
} from './auditUtils';

describe('scopeParams', () => {
  it('maps each scope to the server filters', () => {
    expect(scopeParams('all')).toEqual({});
    expect(scopeParams('mutations')).toEqual({ kind: AuditKind.ApiCall, mutationsOnly: true });
    expect(scopeParams('api')).toEqual({ kind: AuditKind.ApiCall });
    expect(scopeParams('pages')).toEqual({ kind: AuditKind.PageView });
    expect(scopeParams('clicks')).toEqual({ kind: AuditKind.Click });
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

describe('isMutation', () => {
  const base: AuditEvent = {
    id: 1, at: new Date(), kind: AuditKind.ApiCall, name: 'x', path: '/x',
  };

  it('is any non-GET API call', () => {
    expect(isMutation({ ...base, method: 'PUT' })).toBe(true);
    expect(isMutation({ ...base, method: 'GET' })).toBe(false);
    expect(isMutation({ ...base, kind: AuditKind.Click })).toBe(false);
  });
});
