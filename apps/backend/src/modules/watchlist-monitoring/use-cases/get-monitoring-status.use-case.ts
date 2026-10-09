import { Inject, Injectable } from '@nestjs/common';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import type { WatchlistMonitoringReadRepository } from '../domain/repositories/watchlist-monitoring-read.repository.interface';
import { WATCHLIST_MONITORING_READ_REPOSITORY } from '../constants/tokens';
import { GetWatchlistByIdUseCase } from '../../watchlist/use-cases/get-watchlist-by-id.use-case';
import type { AuthContext } from '../../auth/auth-context.interface';

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
