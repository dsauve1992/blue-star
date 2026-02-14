import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { HistoricalData } from '../../../market-data/domain/services/market-data.service';

export interface BreakoutDetectionResult {
  ticker: WatchlistTicker;
  detected: boolean;
}

export interface BreakoutDetectionService {
  detect(
    ticker: WatchlistTicker,
    historicalData: HistoricalData,
  ): BreakoutDetectionResult;
}
