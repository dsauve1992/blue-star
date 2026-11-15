import { WatchlistTicker } from '../../../watchlist/watchlist.module';

export interface GapDetectionResult {
  ticker: WatchlistTicker;
  detected: boolean;
  entryPrice?: number;
  stopPrice?: number;
}

export interface IGapDetectionService {
  detect(ticker: WatchlistTicker, now?: Date): Promise<GapDetectionResult>;
}
