import { Inject, Injectable } from '@nestjs/common';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import type { WatchlistMonitoringWriteRepository } from '../domain/repositories/watchlist-monitoring-write.repository.interface';
import { WATCHLIST_MONITORING_WRITE_REPOSITORY } from '../constants/tokens';
import type { WatchlistReadRepository } from '../../watchlist/domain/repositories/watchlist-read.repository.interface';
import { WATCHLIST_READ_REPOSITORY } from '../../watchlist/constants/tokens';
import type { AuthContext } from '../../auth/auth-context.interface';
import { AuthorizationError, NotFoundError } from '../domain/domain-errors';

export interface DeactivateMonitoringRequestDto {
  watchlistId: WatchlistId;
  type: MonitoringType;
}

export interface DeactivateMonitoringResponseDto {
  active: boolean;
}

@Injectable()
export class DeactivateMonitoringUseCase {
  constructor(
    @Inject(WATCHLIST_MONITORING_WRITE_REPOSITORY)
    private readonly monitoringWriteRepository: WatchlistMonitoringWriteRepository,
    @Inject(WATCHLIST_READ_REPOSITORY)
    private readonly watchlistReadRepository: WatchlistReadRepository,
  ) {}

  async execute(
    request: DeactivateMonitoringRequestDto,
    authContext: AuthContext,
  ): Promise<DeactivateMonitoringResponseDto> {
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

    const monitoring =
      await this.monitoringWriteRepository.findByWatchlistIdAndType(
        request.watchlistId,
        request.type,
      );

    if (!monitoring) {
      throw new NotFoundError(
        `No ${request.type} monitoring found for watchlist ${request.watchlistId.value}`,
      );
    }

    monitoring.deactivate();
    await this.monitoringWriteRepository.save(monitoring);

    return {
      active: monitoring.active,
    };
  }
}
