import { Watchlist } from '../entities/watchlist';
import { WatchlistId } from '../value-objects/watchlist-id';
import { UserId } from 'src/modules/position/domain/value-objects/user-id';

export interface WatchlistReadRepository {
  findById(watchlistId: WatchlistId): Promise<Watchlist | null>;
  findByUserId(userId: UserId): Promise<Watchlist[]>;
}
