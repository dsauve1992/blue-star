import { DateTime } from 'luxon';

export const MARKET_TIMEZONE = 'America/Toronto';

export function getMarketDateKey(now: Date = new Date()): string {
  return DateTime.fromJSDate(now, { zone: MARKET_TIMEZONE }).toFormat(
    'yyyy-LL-dd',
  );
}
