import { Inject, Injectable } from '@nestjs/common';
import { Watchlist } from '../domain/entities/watchlist';
import { WatchlistId } from '../domain/value-objects/watchlist-id';
import { WatchlistName } from '../domain/value-objects/watchlist-name';
import type { WatchlistWriteRepository } from '../domain/repositories/watchlist-write.repository.interface';
import type { AuthContext } from '../../auth/auth-context.interface';
import { WATCHLIST_WRITE_REPOSITORY } from '../constants/tokens';
import { AuthorizationError } from '../domain/domain-errors';

export interface RenameWatchlistRequestDto {
  watchlistId: WatchlistId;
  name: WatchlistName;
}

export interface RenameWatchlistResponseDto {
  watchlist: Watchlist;
}

@Injectable()
export class RenameWatchlistUseCase {
  constructor(
    @Inject(WATCHLIST_WRITE_REPOSITORY)
    private readonly watchlistWriteRepository: WatchlistWriteRepository,
  ) {}

  async execute(
    request: RenameWatchlistRequestDto,
    authContext: AuthContext,
  ): Promise<RenameWatchlistResponseDto> {
    const watchlist = await this.watchlistWriteRepository.getById(
      request.watchlistId,
    );

    if (watchlist.userId.value !== authContext.userId.value) {
      throw new AuthorizationError('User does not own this watchlist');
    }

    watchlist.rename(request.name);

    await this.watchlistWriteRepository.save(watchlist);

    return {
      watchlist,
    };
  }
}
