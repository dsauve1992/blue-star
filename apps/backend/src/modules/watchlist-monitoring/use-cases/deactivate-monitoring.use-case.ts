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
  type?: MonitoringType;
}

export interface DeactivatedMonitoringDto {
  type: MonitoringType;
  active: boolean;
}

export interface DeactivateMonitoringResponseDto {
  monitorings: DeactivatedMonitoringDto[];
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

    if (request.type) {
      const deactivated = await this.deactivateType(
        request.watchlistId,
        request.type,
        true,
      );
      return { monitorings: deactivated ? [deactivated] : [] };
    }

    const monitorings: DeactivatedMonitoringDto[] = [];
    for (const type of Object.values(MonitoringType)) {
      const deactivated = await this.deactivateType(
        request.watchlistId,
        type,
        false,
      );
      if (deactivated) {
        monitorings.push(deactivated);
      }
    }

    return { monitorings };
  }

  private async deactivateType(
    watchlistId: WatchlistId,
    type: MonitoringType,
    throwIfMissing: boolean,
  ): Promise<DeactivatedMonitoringDto | null> {
    const monitoring =
      await this.monitoringWriteRepository.findByWatchlistIdAndType(
        watchlistId,
        type,
      );

    if (!monitoring) {
      if (throwIfMissing) {
        throw new NotFoundError(
          `No ${type} monitoring found for watchlist ${watchlistId.value}`,
        );
      }
      return null;
    }

    monitoring.deactivate();
    await this.monitoringWriteRepository.save(monitoring);

    return {
      type: monitoring.type,
      active: monitoring.active,
    };
  }
}
