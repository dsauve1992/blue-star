import { Inject, Injectable } from '@nestjs/common';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import type { WatchlistMonitoringWriteRepository } from '../domain/repositories/watchlist-monitoring-write.repository.interface';
import { WATCHLIST_MONITORING_WRITE_REPOSITORY } from '../constants/tokens';

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
  ) {}

  async execute(
    request: DeactivateMonitoringRequestDto,
  ): Promise<DeactivateMonitoringResponseDto> {
    const monitoring =
      await this.monitoringWriteRepository.findByWatchlistIdAndType(
        request.watchlistId,
        request.type,
      );

    if (!monitoring) {
      throw new Error(
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
