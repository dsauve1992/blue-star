import { Inject, Injectable } from '@nestjs/common';
import { WatchlistId } from '../domain/value-objects/watchlist-id';
import type { WatchlistWriteRepository } from '../domain/repositories/watchlist-write.repository.interface';
import type { AuthContext } from '../../auth/auth-context.interface';
import { WATCHLIST_WRITE_REPOSITORY } from '../constants/tokens';

export interface DeleteWatchlistRequestDto {
  watchlistId: WatchlistId;
}

export interface DeleteWatchlistResponseDto {
  success: boolean;
}

@Injectable()
export class DeleteWatchlistUseCase {
  constructor(
    @Inject(WATCHLIST_WRITE_REPOSITORY)
    private readonly watchlistWriteRepository: WatchlistWriteRepository,
  ) {}

  async execute(
    request: DeleteWatchlistRequestDto,
    authContext: AuthContext,
  ): Promise<DeleteWatchlistResponseDto> {
    const watchlist = await this.watchlistWriteRepository.getById(
      request.watchlistId,
    );

    if (watchlist.userId.value !== authContext.userId.value) {
      throw new Error('User does not own this watchlist');
    }

    await this.watchlistWriteRepository.delete(request.watchlistId);

    return {
      success: true,
    };
  }
}
