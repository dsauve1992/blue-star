import { WatchlistTicker } from '../../../watchlist/watchlist.module';

export interface BreakoutDetectionResult {
  ticker: WatchlistTicker;
  detected: boolean;
}

export interface BreakoutDetectionService {
  detect(ticker: WatchlistTicker, now?: Date): Promise<BreakoutDetectionResult>;
}
