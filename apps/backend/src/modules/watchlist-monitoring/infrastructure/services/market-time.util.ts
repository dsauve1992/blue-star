import { DateTime } from 'luxon';

const MARKET_TIMEZONE = 'America/Toronto';
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 30;
const MARKET_CLOSE_HOUR = 16;
const MARKET_CLOSE_MINUTE = 0;

export function getMarketDateKey(now: Date = new Date()): string {
  return DateTime.fromJSDate(now, { zone: MARKET_TIMEZONE }).toFormat(
    'yyyy-LL-dd',
  );
}

export function getMarketOpenDateUtc(now: Date = new Date()): Date {
  return DateTime.fromJSDate(now, { zone: MARKET_TIMEZONE })
    .set({
      hour: MARKET_OPEN_HOUR,
      minute: MARKET_OPEN_MINUTE,
      second: 0,
      millisecond: 0,
    })
    .toUTC()
    .toJSDate();
}

export function isWithinMarketHours(now: Date = new Date()): boolean {
  return isDuringMarketHours(now);
}

export function isDuringMarketHours(date: Date): boolean {
  const torontoTime = DateTime.fromJSDate(date, { zone: MARKET_TIMEZONE });
  const totalMinutes = torontoTime.hour * 60 + torontoTime.minute;
  const marketOpen = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE;
  const marketClose = MARKET_CLOSE_HOUR * 60 + MARKET_CLOSE_MINUTE;
  return totalMinutes >= marketOpen && totalMinutes <= marketClose;
}
