import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';

export interface GapDetectionResult {
  ticker: WatchlistTicker;
  detected: boolean;
  entryPrice?: number;
  stopPrice?: number;
}

export interface GapDetectionService {
  detect(ticker: WatchlistTicker, now?: Date): Promise<GapDetectionResult>;
}
