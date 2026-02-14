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

const HISTORICAL_API_INTERVALS: Interval[] = ['1d', '1wk', '1mo'];

export function isHistoricalApiInterval(interval: Interval): boolean {
  return HISTORICAL_API_INTERVALS.includes(interval);
}

export interface MarketDataService {
  getHistoricalData(
    symbol: Symbol,
    dateRange: DateRange,
    _interval?: Interval,
  ): Promise<HistoricalData>;
}
