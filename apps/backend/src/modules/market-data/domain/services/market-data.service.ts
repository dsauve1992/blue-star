import { Symbol } from '../value-objects/symbol';
import { DateRange } from '../value-objects/date-range';
import { PricePoint } from '../value-objects/price-point';

export interface HistoricalData {
  symbol: Symbol;
  dateRange: DateRange;
  pricePoints: PricePoint[];
}

export interface MarketDataService {
  getHistoricalData(
    symbol: Symbol,
    dateRange: DateRange,
  ): Promise<HistoricalData>;
}
