import { Inject, Injectable } from '@nestjs/common';
import { WatchlistMonitoring } from '../domain/entities/watchlist-monitoring.entity';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import { WatchlistMonitoringId } from '../domain/value-objects/watchlist-monitoring-id';
import type { WatchlistMonitoringWriteRepository } from '../domain/repositories/watchlist-monitoring-write.repository.interface';
import { WATCHLIST_MONITORING_WRITE_REPOSITORY } from '../constants/tokens';

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
  ) {}

  async execute(
    request: ActivateMonitoringRequestDto,
  ): Promise<ActivateMonitoringResponseDto> {
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
