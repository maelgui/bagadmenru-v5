const PAD_LENGTH = 2;

/**
 * Returns the ISO date string (YYYY-MM-DD) for a given Date object,
 * using the local calendar date (not UTC, which can shift by a day).
 */
export function toIsoDate(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(PAD_LENGTH, '0');
  const day = String(date.getDate()).padStart(PAD_LENGTH, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses an ISO date string (YYYY-MM-DD) into a Date at local midnight.
 * `new Date('YYYY-MM-DD')` would parse as UTC midnight and shift the
 * calendar date in western timezones.
 */
export function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Returns a Date pinned to UTC midnight of the given local calendar date.
 *
 * The generated API client serializes `date` fields with
 * `value.toISOString().substring(0, 10)`, which uses UTC. A Date at local
 * midnight in a positive-offset timezone (e.g. Europe/Paris) would then
 * serialize to the previous calendar day. Pinning to UTC midnight keeps the
 * calendar date the user picked intact through that serialization.
 */
export function toUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}
