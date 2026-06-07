import { Inject, Injectable } from '@nestjs/common';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import type { WatchlistMonitoringReadRepository } from '../domain/repositories/watchlist-monitoring-read.repository.interface';
import { WATCHLIST_MONITORING_READ_REPOSITORY } from '../constants/tokens';
import type { WatchlistReadRepository } from '../../watchlist/domain/repositories/watchlist-read.repository.interface';
import { WATCHLIST_READ_REPOSITORY } from '../../watchlist/constants/tokens';
import type { AuthContext } from '../../auth/auth-context.interface';
import { AuthorizationError, NotFoundError } from '../domain/domain-errors';

export interface MonitoringStatusDto {
  watchlistId: string;
  type: MonitoringType;
  active: boolean;
}

export interface GetMonitoringStatusRequestDto {
  watchlistId: WatchlistId;
}

export interface GetMonitoringStatusResponseDto {
  monitorings: MonitoringStatusDto[];
}

@Injectable()
export class GetMonitoringStatusUseCase {
  constructor(
    @Inject(WATCHLIST_MONITORING_READ_REPOSITORY)
    private readonly monitoringReadRepository: WatchlistMonitoringReadRepository,
    @Inject(WATCHLIST_READ_REPOSITORY)
    private readonly watchlistReadRepository: WatchlistReadRepository,
  ) {}

  async execute(
    request: GetMonitoringStatusRequestDto,
    authContext: AuthContext,
  ): Promise<GetMonitoringStatusResponseDto> {
    const watchlist = await this.watchlistReadRepository.findById(
      request.watchlistId,
    );

    if (!watchlist) {
      throw new NotFoundError(
        `Watchlist with ID ${request.watchlistId.value} not found`,
      );
    }

    if (watchlist.userId.value !== authContext.userId.value) {
      throw new AuthorizationError('User does not own this watchlist');
    }

    const monitorings = await this.monitoringReadRepository.findByWatchlistId(
      request.watchlistId,
    );

    return {
      monitorings: monitorings.map((m) => ({
        watchlistId: m.watchlistId.value,
        type: m.type,
        active: m.active,
      })),
    };
  }
}
