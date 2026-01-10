import { Symbol } from '../value-objects/symbol';
import { PricePoint } from '../value-objects/price-point';
import { Interval } from '../services/market-data.service';

export interface MarketDataCacheRepository {
  findBySymbolAndDateRange(
    symbol: Symbol,
    startDate: Date,
    endDate: Date,
    interval: Interval,
  ): Promise<PricePoint[]>;

  savePricePoints(
    symbol: Symbol,
    pricePoints: PricePoint[],
    interval: Interval,
  ): Promise<void>;
}
