/**
 * Parse an API date string as a local date, ignoring any UTC offset.
 * API returns timestamps like "2026-03-02T00:00:00.000Z" which represent
 * a calendar date — we extract the date portion so the browser treats it
 * as local midnight instead of converting from UTC.
 */
export function parseLocalDate(dateString: string): Date {
  return new Date(dateString.slice(0, 10));
}
