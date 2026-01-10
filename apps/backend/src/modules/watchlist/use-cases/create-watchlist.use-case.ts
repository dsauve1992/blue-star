import { Inject, Injectable } from '@nestjs/common';
import { Watchlist } from '../domain/entities/watchlist';
import { WatchlistId } from '../domain/value-objects/watchlist-id';
import { WatchlistName } from '../domain/value-objects/watchlist-name';
import type { WatchlistWriteRepository } from '../domain/repositories/watchlist-write.repository.interface';
import type { AuthContext } from '../../auth/auth-context.interface';
import { WATCHLIST_WRITE_REPOSITORY } from '../constants/tokens';

export interface CreateWatchlistRequestDto {
  name: WatchlistName;
}

export interface CreateWatchlistResponseDto {
  watchlistId: WatchlistId;
}

@Injectable()
export class CreateWatchlistUseCase {
  constructor(
    @Inject(WATCHLIST_WRITE_REPOSITORY)
    private readonly watchlistWriteRepository: WatchlistWriteRepository,
  ) {}

  async execute(
    request: CreateWatchlistRequestDto,
    authContext: AuthContext,
  ): Promise<CreateWatchlistResponseDto> {
    const watchlist = Watchlist.create({
      userId: authContext.userId,
      name: request.name,
    });

    await this.watchlistWriteRepository.save(watchlist);

    return {
      watchlistId: watchlist.id,
    };
  }
}
