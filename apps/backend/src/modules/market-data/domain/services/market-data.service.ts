import { Symbol } from '../value-objects/symbol';
import { DateRange } from '../value-objects/date-range';
import { PricePoint } from '../value-objects/price-point';

export interface HistoricalData {
  symbol: Symbol;
  dateRange: DateRange;
  pricePoints: PricePoint[];
}

export type Interval =
  | '1m'
  | '2m'
  | '5m'
  | '15m'
  | '30m'
  | '60m'
  | '90m'
  | '1h'
  | '1d'
  | '5d'
  | '1wk'
  | '1mo'
  | '3mo';

export const INTRADAY_INTERVALS: Interval[] = [
  '1m',
  '2m',
  '5m',
  '15m',
  '30m',
  '60m',
  '90m',
  '1h',
];

export function isIntradayInterval(interval: Interval): boolean {
  return INTRADAY_INTERVALS.includes(interval);
}

const CACHEABLE_HISTORICAL_INTERVALS: Interval[] = ['1d', '1wk', '1mo'];

export function isCacheableHistoricalInterval(
  interval: Interval,
): interval is '1d' | '1wk' | '1mo' {
  return CACHEABLE_HISTORICAL_INTERVALS.includes(interval);
}

export function determineInterval(dateRange: DateRange): Interval {
  const days = dateRange.getDaysDifference();
  if (days <= 90) {
    return '1d';
  }
  if (days <= 365) {
    return '1wk';
  }
  return '1mo';
}

export function deduplicatePricePoints(
  pricePoints: PricePoint[],
  interval: Interval,
): PricePoint[] {
  const seen = new Set<string>();
  const unique: PricePoint[] = [];
  const useTimestampKey = isIntradayInterval(interval);

  for (const point of pricePoints) {
    const key = useTimestampKey
      ? point.date.getTime().toString()
      : point.date.toISOString().split('T')[0];
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(point);
    }
  }

  return unique;
}

export interface MarketDataService {
  getHistoricalData(
    symbol: Symbol,
    dateRange: DateRange,
    _interval?: Interval,
  ): Promise<HistoricalData>;
}
