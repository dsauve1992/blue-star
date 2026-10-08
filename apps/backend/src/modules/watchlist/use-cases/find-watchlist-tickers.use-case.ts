import { Inject, Injectable } from '@nestjs/common';
import { WatchlistId } from '../domain/value-objects/watchlist-id';
import { WatchlistTicker } from '../domain/value-objects/watchlist-ticker';
import type { WatchlistReadRepository } from '../domain/repositories/watchlist-read.repository.interface';
import { WATCHLIST_READ_REPOSITORY } from '../constants/tokens';

@Injectable()
export class FindWatchlistTickersUseCase {
  constructor(
    @Inject(WATCHLIST_READ_REPOSITORY)
    private readonly watchlistReadRepository: WatchlistReadRepository,
  ) {}

  async execute(watchlistId: WatchlistId): Promise<{
    id: WatchlistId;
    name: string;
    tickers: ReadonlyArray<WatchlistTicker>;
  } | null> {
    const watchlist = await this.watchlistReadRepository.findById(watchlistId);
    if (!watchlist) return null;

    return {
      id: watchlist.id,
      name: watchlist.name.value,
      tickers: watchlist.tickers,
    };
  }
}
