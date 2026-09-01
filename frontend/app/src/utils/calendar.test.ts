import { describe, expect, it } from 'vitest';
import { calendarDays } from './calendar';
import { toIsoDate } from './date';

const MONDAY = 1;

function daysFor(monthOffset: number, today: Date) {
  return Array.from(calendarDays(monthOffset, MONDAY, today));
}

describe('calendarDays', () => {
  const today = new Date(2026, 7, 17); // Monday 2026-08-17

  it('yields full weeks starting on Monday', () => {
    const days = daysFor(0, today);
    expect(days.length % 7).toBe(0);
    expect(days[0].day.getDay()).toBe(MONDAY);
    expect(days[days.length - 1].day.getDay()).toBe(0); // Sunday
  });

  it('contains every day of the displayed month exactly once', () => {
    const days = daysFor(0, today);
    const currentMonthDays = days.filter((info) => info.isCurrentMonth);
    expect(currentMonthDays.length).toBe(31); // August has 31 days
    expect(toIsoDate(currentMonthDays[0].day)).toBe('2026-08-01');
    expect(toIsoDate(currentMonthDays[30].day)).toBe('2026-08-31');
  });

  it('marks only today as isToday', () => {
    const days = daysFor(0, today);
    const todayCells = days.filter((info) => info.isToday);
    expect(todayCells.length).toBe(1);
    expect(toIsoDate(todayCells[0].day)).toBe('2026-08-17');
  });

  it('does not mark any day as today when displaying another month', () => {
    const days = daysFor(1, today);
    expect(days.some((info) => info.isToday)).toBe(false);
  });

  it('handles month offsets crossing a year boundary', () => {
    const days = daysFor(5, today); // January 2027
    const currentMonthDays = days.filter((info) => info.isCurrentMonth);
    expect(currentMonthDays.length).toBe(31);
    expect(toIsoDate(currentMonthDays[0].day)).toBe('2027-01-01');
  });

  it('flags leading and trailing days as outside the current month', () => {
    // September 2026 starts on a Tuesday: the grid must lead with Monday 08-31.
    const days = daysFor(1, today);
    expect(toIsoDate(days[0].day)).toBe('2026-08-31');
    expect(days[0].isCurrentMonth).toBe(false);
  });

  it('does not duplicate or skip days when a month ends near a DST change', () => {
    // Europe/Paris switches to winter time on 2026-10-25.
    const october = daysFor(2, today);
    const isoDates = october.map((info) => toIsoDate(info.day));
    expect(new Set(isoDates).size).toBe(isoDates.length);
    expect(october.filter((info) => info.isCurrentMonth).length).toBe(31);
  });
});
