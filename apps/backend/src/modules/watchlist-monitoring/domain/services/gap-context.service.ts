import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { GapContext } from '../value-objects/gap-context';

export interface GapContextService {
  enrich(ticker: WatchlistTicker): Promise<GapContext>;
}
