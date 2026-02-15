import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';

export interface BreakoutDetectionResult {
  ticker: WatchlistTicker;
  detected: boolean;
}

export interface BreakoutDetectionService {
  detect(ticker: WatchlistTicker, now?: Date): Promise<BreakoutDetectionResult>;
}
