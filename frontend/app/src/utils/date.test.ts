import { describe, expect, it } from 'vitest';
import { fromIsoDate, toIsoDate } from './date';

describe('toIsoDate', () => {
  it('formats a date as YYYY-MM-DD using the local calendar date', () => {
    expect(toIsoDate(new Date(2026, 7, 17))).toBe('2026-08-17');
  });

  it('pads single-digit months and days', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('does not shift the date for times close to midnight', () => {
    // With UTC-based formatting (toISOString), a local 00:30 in a
    // positive-offset timezone would render as the previous day.
    expect(toIsoDate(new Date(2026, 7, 17, 0, 30))).toBe('2026-08-17');
    expect(toIsoDate(new Date(2026, 7, 17, 23, 30))).toBe('2026-08-17');
  });
});

describe('fromIsoDate', () => {
  it('parses to local midnight', () => {
    const date = fromIsoDate('2026-08-17');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(17);
    expect(date.getHours()).toBe(0);
  });

  it('roundtrips with toIsoDate', () => {
    expect(toIsoDate(fromIsoDate('2026-01-31'))).toBe('2026-01-31');
    expect(toIsoDate(fromIsoDate('2026-12-01'))).toBe('2026-12-01');
  });
});
