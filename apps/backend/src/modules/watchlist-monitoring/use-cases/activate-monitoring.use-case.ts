import { Inject, Injectable } from '@nestjs/common';
import { WatchlistMonitoring } from '../domain/entities/watchlist-monitoring.entity';
import { WatchlistId } from '../../watchlist/domain/value-objects/watchlist-id';
import { MonitoringType } from '../domain/value-objects/monitoring-type';
import { WatchlistMonitoringId } from '../domain/value-objects/watchlist-monitoring-id';
import type { WatchlistMonitoringWriteRepository } from '../domain/repositories/watchlist-monitoring-write.repository.interface';
import { WATCHLIST_MONITORING_WRITE_REPOSITORY } from '../constants/tokens';
import { GetWatchlistByIdUseCase } from '../../watchlist/use-cases/get-watchlist-by-id.use-case';
import type { AuthContext } from '../../auth/auth-context.interface';

export interface ActivateMonitoringRequestDto {
  watchlistId: WatchlistId;
  type?: MonitoringType;
}

export interface ActivatedMonitoringDto {
  monitoringId: WatchlistMonitoringId;
  type: MonitoringType;
  active: boolean;
}

export interface ActivateMonitoringResponseDto {
  monitorings: ActivatedMonitoringDto[];
}

@Injectable()
export class ActivateMonitoringUseCase {
  constructor(
    @Inject(WATCHLIST_MONITORING_WRITE_REPOSITORY)
    private readonly monitoringWriteRepository: WatchlistMonitoringWriteRepository,
    private readonly getWatchlistById: GetWatchlistByIdUseCase,
  ) {}

  async execute(
    request: ActivateMonitoringRequestDto,
    authContext: AuthContext,
  ): Promise<ActivateMonitoringResponseDto> {
    await this.getWatchlistById.execute(
      { watchlistId: request.watchlistId },
      authContext,
    );

    const types = request.type ? [request.type] : Object.values(MonitoringType);

    const monitorings: ActivatedMonitoringDto[] = [];
    for (const type of types) {
      monitorings.push(await this.activateType(request.watchlistId, type));
    }

    return { monitorings };
  }

  private async activateType(
    watchlistId: WatchlistId,
    type: MonitoringType,
  ): Promise<ActivatedMonitoringDto> {
    const existing =
      await this.monitoringWriteRepository.findByWatchlistIdAndType(
        watchlistId,
        type,
      );

    if (existing) {
      existing.activate();
      await this.monitoringWriteRepository.save(existing);
      return {
        monitoringId: existing.id,
        type: existing.type,
        active: existing.active,
      };
    }

    const monitoring = WatchlistMonitoring.create({ watchlistId, type });
    await this.monitoringWriteRepository.save(monitoring);

    return {
      monitoringId: monitoring.id,
      type: monitoring.type,
      active: monitoring.active,
    };
  }
}
