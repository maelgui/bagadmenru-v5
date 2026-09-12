// @vitest-environment jsdom
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { isPasskeySnoozed, snoozePasskeyPrompts } from './passkeySnooze';

afterEach(() => {
  window.localStorage.clear();
  vi.useRealTimers();
});

describe('passkeySnooze', () => {
  it('is not snoozed by default', () => {
    expect(isPasskeySnoozed('u1')).toBe(false);
  });

  it('snoozes per account, not globally', () => {
    snoozePasskeyPrompts('u1');
    expect(isPasskeySnoozed('u1')).toBe(true);
    // Family device: another member of the same browser is unaffected.
    expect(isPasskeySnoozed('u2')).toBe(false);
  });

  it('expires after the snooze window', () => {
    vi.useFakeTimers();
    snoozePasskeyPrompts('u1');
    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(isPasskeySnoozed('u1')).toBe(false);
  });

  it('treats garbage stored values as not snoozed', () => {
    window.localStorage.setItem('bmr:passkey-snooze:u1', 'not-a-number');
    expect(isPasskeySnoozed('u1')).toBe(false);
  });
});
