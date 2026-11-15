import { Inject, Injectable } from '@nestjs/common';
import {
  WatchlistId,
  GetWatchlistByIdUseCase,
} from '../../watchlist/watchlist.module';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import type { WatchlistMonitoringReadRepository } from '../domain/repositories/watchlist-monitoring-read.repository.interface';
import { WATCHLIST_MONITORING_READ_REPOSITORY } from '../constants/tokens';
import type { AuthContext } from '../../auth/auth.module';

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
    private readonly getWatchlistById: GetWatchlistByIdUseCase,
  ) {}

  async execute(
    request: GetMonitoringStatusRequestDto,
    authContext: AuthContext,
  ): Promise<GetMonitoringStatusResponseDto> {
    await this.getWatchlistById.execute(
      { watchlistId: request.watchlistId },
      authContext,
    );

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
