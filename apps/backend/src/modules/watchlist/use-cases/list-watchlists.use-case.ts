import { Inject, Injectable } from '@nestjs/common';
import { Watchlist } from '../domain/entities/watchlist';
import type { WatchlistReadRepository } from '../domain/repositories/watchlist-read.repository.interface';
import type { AuthContext } from '../../auth/auth-context.interface';
import { WATCHLIST_READ_REPOSITORY } from '../constants/tokens';

export interface ListWatchlistsResponseDto {
  watchlists: Watchlist[];
}

@Injectable()
export class ListWatchlistsUseCase {
  constructor(
    @Inject(WATCHLIST_READ_REPOSITORY)
    private readonly watchlistReadRepository: WatchlistReadRepository,
  ) {}

  async execute(authContext: AuthContext): Promise<ListWatchlistsResponseDto> {
    const watchlists = await this.watchlistReadRepository.findByUserId(
      authContext.userId,
    );

    return {
      watchlists,
    };
  }
}
