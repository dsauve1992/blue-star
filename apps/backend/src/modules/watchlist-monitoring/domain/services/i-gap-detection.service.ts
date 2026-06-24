import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
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
