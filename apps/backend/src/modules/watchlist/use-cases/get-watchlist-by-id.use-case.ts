import { Inject, Injectable } from '@nestjs/common';
import { Watchlist } from '../domain/entities/watchlist';
import { WatchlistId } from '../domain/value-objects/watchlist-id';
import type { WatchlistReadRepository } from '../domain/repositories/watchlist-read.repository.interface';
import type { AuthContext } from '../../auth/auth-context.interface';
import { WATCHLIST_READ_REPOSITORY } from '../constants/tokens';

export interface GetWatchlistByIdRequestDto {
  watchlistId: WatchlistId;
}

export interface GetWatchlistByIdResponseDto {
  watchlist: Watchlist;
}

@Injectable()
export class GetWatchlistByIdUseCase {
  constructor(
    @Inject(WATCHLIST_READ_REPOSITORY)
    private readonly watchlistReadRepository: WatchlistReadRepository,
  ) {}

  async execute(
    request: GetWatchlistByIdRequestDto,
    authContext: AuthContext,
  ): Promise<GetWatchlistByIdResponseDto> {
    const watchlist = await this.watchlistReadRepository.findById(
      request.watchlistId,
    );

    if (!watchlist) {
      throw new Error(
        `Watchlist with ID ${request.watchlistId.value} not found`,
      );
    }

    if (watchlist.userId.value !== authContext.userId.value) {
      throw new Error('User does not own this watchlist');
    }

    return {
      watchlist,
    };
  }
}
