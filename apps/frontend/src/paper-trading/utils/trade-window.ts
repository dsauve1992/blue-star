import type { ChartCandleDto } from "../../market-data/api/chart-data.client";

const MAX_DAILY_RANGE_DAYS = 90;
const DAILY_LOOKBACK_DAYS = 72;
const INTRADAY_LOOKBACK_DAYS = 2;
const INTRADAY_AVAILABILITY_DAYS = 58;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function dailyWindow(
  marketDate: string,
  closedAt: string | null,
): { startDate: string; endDate: string } {
  const entryDate = toDateOnly(marketDate);
  const rawEndDate = closedAt ? toDateOnly(closedAt) : toDateOnly(formatDate(new Date()));
  const startDate = addDays(entryDate, -DAILY_LOOKBACK_DAYS);

  const maxEndDate = addDays(startDate, MAX_DAILY_RANGE_DAYS);
  const endDate = rawEndDate.getTime() > maxEndDate.getTime() ? maxEndDate : rawEndDate;

  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}

export function sliceDailyToWindow(
  candles: ChartCandleDto[],
  marketDate: string,
): ChartCandleDto[] {
  const entryIndex = candles.findIndex((candle) => String(candle.time) >= marketDate.slice(0, 10));
  if (entryIndex === -1) return candles;

  const startIndex = Math.max(0, entryIndex - 50);
  return candles.slice(startIndex);
}

export function intradayWindow(
  openedAt: string,
  closedAt: string | null,
): { startDate: string; endDate: string } {
  const openedDate = new Date(openedAt);
  const startDate = addDays(openedDate, -INTRADAY_LOOKBACK_DAYS);
  const endDate = closedAt ? new Date(closedAt) : addDays(openedDate, 1);

  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}

function findEntryBarIndex(
  candles: ChartCandleDto[],
  entryEpochSeconds: number,
): number {
  return candles.findIndex((candle) => Number(candle.time) >= entryEpochSeconds);
}

export function sliceIntradayToEntry(
  candles: ChartCandleDto[],
  openedAt: string,
): ChartCandleDto[] {
  const entryEpochSeconds = Math.floor(new Date(openedAt).getTime() / 1000);
  const entryIndex = findEntryBarIndex(candles, entryEpochSeconds);
  if (entryIndex === -1) return candles;

  const startIndex = Math.max(0, entryIndex - 20);
  return candles.slice(startIndex);
}

export function entryBarTime(
  candles: ChartCandleDto[],
  entryDateOrTimestamp: string,
): ChartCandleDto["time"] | null {
  const isDailyDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(entryDateOrTimestamp);

  if (isDailyDateOnly) {
    const index = candles.findIndex(
      (candle) => String(candle.time) >= entryDateOrTimestamp,
    );
    return index === -1 ? null : candles[index].time;
  }

  const entryEpochSeconds = Math.floor(
    new Date(entryDateOrTimestamp).getTime() / 1000,
  );
  const index = findEntryBarIndex(candles, entryEpochSeconds);
  return index === -1 ? null : candles[index].time;
}

export function isIntradayAvailable(openedAt: string): boolean {
  const ageDays = (Date.now() - new Date(openedAt).getTime()) / MS_PER_DAY;
  return ageDays <= INTRADAY_AVAILABILITY_DAYS;
}
