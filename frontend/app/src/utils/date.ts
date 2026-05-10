const ISO_DATE_LENGTH = 10;

/**
 * Returns the ISO date string (YYYY-MM-DD) for a given Date object.
 */
export function toIsoDate(date: Date): string {
  return date.toISOString().substring(0, ISO_DATE_LENGTH);
}
