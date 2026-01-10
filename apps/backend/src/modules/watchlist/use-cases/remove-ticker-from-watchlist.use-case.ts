import { Inject, Injectable } from '@nestjs/common';
import { Watchlist } from '../domain/entities/watchlist';
import { WatchlistId } from '../domain/value-objects/watchlist-id';
import { WatchlistTicker } from '../domain/value-objects/watchlist-ticker';
import type { WatchlistWriteRepository } from '../domain/repositories/watchlist-write.repository.interface';
import type { AuthContext } from '../../auth/auth-context.interface';
import { WATCHLIST_WRITE_REPOSITORY } from '../constants/tokens';

export interface RemoveTickerFromWatchlistRequestDto {
  watchlistId: WatchlistId;
  ticker: WatchlistTicker;
}

export interface RemoveTickerFromWatchlistResponseDto {
  watchlist: Watchlist;
}

@Injectable()
export class RemoveTickerFromWatchlistUseCase {
  constructor(
    @Inject(WATCHLIST_WRITE_REPOSITORY)
    private readonly watchlistWriteRepository: WatchlistWriteRepository,
  ) {}

  async execute(
    request: RemoveTickerFromWatchlistRequestDto,
    authContext: AuthContext,
  ): Promise<RemoveTickerFromWatchlistResponseDto> {
    const watchlist = await this.watchlistWriteRepository.getById(
      request.watchlistId,
    );

    if (watchlist.userId.value !== authContext.userId.value) {
      throw new Error('User does not own this watchlist');
    }

    watchlist.removeTicker(request.ticker);

    await this.watchlistWriteRepository.save(watchlist);

    return {
      watchlist,
    };
  }
}
