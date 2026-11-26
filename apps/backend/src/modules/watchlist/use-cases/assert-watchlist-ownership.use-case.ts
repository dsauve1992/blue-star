import { Inject, Injectable } from '@nestjs/common';
import { WatchlistId } from '../domain/value-objects/watchlist-id';
import type { WatchlistReadRepository } from '../domain/repositories/watchlist-read.repository.interface';
import type { AuthContext } from '../../auth/auth.module';
import { WATCHLIST_READ_REPOSITORY } from '../constants/tokens';
import { AuthorizationError, NotFoundError } from '../domain/domain-errors';

@Injectable()
export class AssertWatchlistOwnershipUseCase {
  constructor(
    @Inject(WATCHLIST_READ_REPOSITORY)
    private readonly watchlistReadRepository: WatchlistReadRepository,
  ) {}

  async execute(
    watchlistId: WatchlistId,
    authContext: AuthContext,
  ): Promise<void> {
    const watchlist = await this.watchlistReadRepository.findById(watchlistId);

    if (!watchlist) {
      throw new NotFoundError(
        `Watchlist with ID ${watchlistId.value} not found`,
      );
    }

    if (watchlist.userId.value !== authContext.userId.value) {
      throw new AuthorizationError('User does not own this watchlist');
    }
  }
}
