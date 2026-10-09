import { Inject, Injectable } from '@nestjs/common';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import type { WatchlistMonitoringWriteRepository } from '../domain/repositories/watchlist-monitoring-write.repository.interface';
import { WATCHLIST_MONITORING_WRITE_REPOSITORY } from '../constants/tokens';
import { GetWatchlistByIdUseCase } from '../../watchlist/use-cases/get-watchlist-by-id.use-case';
import type { AuthContext } from '../../auth/auth-context.interface';
import { NotFoundError } from '../domain/domain-errors';

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
    private readonly getWatchlistById: GetWatchlistByIdUseCase,
  ) {}

  async execute(
    request: DeactivateMonitoringRequestDto,
    authContext: AuthContext,
  ): Promise<DeactivateMonitoringResponseDto> {
    await this.getWatchlistById.execute(
      { watchlistId: request.watchlistId },
      authContext,
    );

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
