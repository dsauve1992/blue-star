import { Watchlist } from '../entities/watchlist';
import { WatchlistId } from '../value-objects/watchlist-id';

export interface WatchlistWriteRepository {
  save(watchlist: Watchlist): Promise<void>;
  getById(watchlistId: WatchlistId): Promise<Watchlist>;
  delete(watchlistId: WatchlistId): Promise<void>;
}

