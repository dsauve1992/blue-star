import { WatchlistTicker } from '../../../watchlist/watchlist.module';
import { GapContext } from '../value-objects/gap-context';

export interface GapDetectionResult {
  ticker: WatchlistTicker;
  detected: boolean;
  entryPrice?: number;
  stopPrice?: number;
  context?: GapContext;
}

export interface IGapDetectionService {
  detect(ticker: WatchlistTicker, now?: Date): Promise<GapDetectionResult>;
}
