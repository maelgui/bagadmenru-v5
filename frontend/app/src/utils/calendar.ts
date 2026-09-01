import { toIsoDate } from './date';

const DAYS_IN_WEEK = 7;

export interface CalendarDayInfo {
  day: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Yields every day of the calendar grid for the month at `monthOffset`
 * from the current month, padded to full weeks. All dates are local:
 * mixing UTC construction with local reads shifts days near midnight UTC.
 *
 * @param monthOffset offset in months from the current month
 * @param dayOffset first day of the week (1 = Monday)
 * @param today reference date (injectable for tests)
 */
export function* calendarDays(monthOffset: number, dayOffset = 1, today = new Date()): Generator<CalendarDayInfo> {
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const displayedMonth = firstOfMonth.getMonth();
  const todayIso = toIsoDate(today);

  const firstDay = new Date(firstOfMonth);
  firstDay.setDate(firstDay.getDate() - ((firstDay.getDay() - dayOffset + DAYS_IN_WEEK) % DAYS_IN_WEEK));
  const lastDay = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() + 1, 0);
  lastDay.setDate(lastDay.getDate() + ((DAYS_IN_WEEK - lastDay.getDay() - 1 + dayOffset) % DAYS_IN_WEEK));

  let current = new Date(firstDay);
  while (current <= lastDay) {
    yield {
      day: new Date(current),
      isCurrentMonth: current.getMonth() === displayedMonth,
      isToday: toIsoDate(current) === todayIso,
    };
    const next = new Date(current);
    next.setDate(next.getDate() + 1);
    current = next;
  }
}
