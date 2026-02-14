import { Inject, Injectable } from '@nestjs/common';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import type { WatchlistMonitoringReadRepository } from '../domain/repositories/watchlist-monitoring-read.repository.interface';
import { WATCHLIST_MONITORING_READ_REPOSITORY } from '../constants/tokens';

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
  ) {}

  async execute(
    request: GetMonitoringStatusRequestDto,
  ): Promise<GetMonitoringStatusResponseDto> {
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
