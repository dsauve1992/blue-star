import { Inject, Injectable } from '@nestjs/common';
import { WatchlistMonitoring } from '../domain/entities/watchlist-monitoring.entity';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import { WatchlistMonitoringId } from '../domain/value-objects/watchlist-monitoring-id';
import type { WatchlistMonitoringWriteRepository } from '../domain/repositories/watchlist-monitoring-write.repository.interface';
import { WATCHLIST_MONITORING_WRITE_REPOSITORY } from '../constants/tokens';
import type { WatchlistReadRepository } from '../../watchlist/domain/repositories/watchlist-read.repository.interface';
import { WATCHLIST_READ_REPOSITORY } from '../../watchlist/constants/tokens';
import type { AuthContext } from '../../auth/auth-context.interface';
import { AuthorizationError, NotFoundError } from '../domain/domain-errors';

export interface ActivateMonitoringRequestDto {
  watchlistId: WatchlistId;
  type: MonitoringType;
}

export interface ActivateMonitoringResponseDto {
  monitoringId: WatchlistMonitoringId;
  active: boolean;
}

@Injectable()
export class ActivateMonitoringUseCase {
  constructor(
    @Inject(WATCHLIST_MONITORING_WRITE_REPOSITORY)
    private readonly monitoringWriteRepository: WatchlistMonitoringWriteRepository,
    @Inject(WATCHLIST_READ_REPOSITORY)
    private readonly watchlistReadRepository: WatchlistReadRepository,
  ) {}

  async execute(
    request: ActivateMonitoringRequestDto,
    authContext: AuthContext,
  ): Promise<ActivateMonitoringResponseDto> {
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

    const existing =
      await this.monitoringWriteRepository.findByWatchlistIdAndType(
        request.watchlistId,
        request.type,
      );

    if (existing) {
      existing.activate();
      await this.monitoringWriteRepository.save(existing);
      return {
        monitoringId: existing.id,
        active: existing.active,
      };
    }

    const monitoring = WatchlistMonitoring.create({
      watchlistId: request.watchlistId,
      type: request.type,
    });

    await this.monitoringWriteRepository.save(monitoring);

    return {
      monitoringId: monitoring.id,
      active: monitoring.active,
    };
  }
}
