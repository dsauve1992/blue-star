import { WatchlistTicker } from '../../../watchlist/watchlist.module';
import { GapContext } from '../value-objects/gap-context';

export interface GapContextService {
  enrich(ticker: WatchlistTicker): Promise<GapContext>;
}
