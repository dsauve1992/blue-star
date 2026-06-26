import { Injectable } from '@nestjs/common';
import {
  ActivateMonitoringApiResponseDto,
  DeactivateMonitoringApiResponseDto,
  GetMonitoringStatusApiResponseDto,
} from './watchlist-monitoring-api.dto';
import { ActivateMonitoringResponseDto } from '../use-cases/activate-monitoring.use-case';
import { DeactivateMonitoringResponseDto } from '../use-cases/deactivate-monitoring.use-case';
import { GetMonitoringStatusResponseDto } from '../use-cases/get-monitoring-status.use-case';

@Injectable()
export class WatchlistMonitoringApiMapper {
  mapActivateMonitoringResponse(
    useCaseResponse: ActivateMonitoringResponseDto,
  ): ActivateMonitoringApiResponseDto {
    return {
      monitorings: useCaseResponse.monitorings.map((monitoring) => ({
        monitoringId: monitoring.monitoringId.value,
        type: monitoring.type,
        active: monitoring.active,
      })),
    };
  }

  mapDeactivateMonitoringResponse(
    useCaseResponse: DeactivateMonitoringResponseDto,
  ): DeactivateMonitoringApiResponseDto {
    return {
      monitorings: useCaseResponse.monitorings.map((monitoring) => ({
        type: monitoring.type,
        active: monitoring.active,
      })),
    };
  }

  mapGetMonitoringStatusResponse(
    useCaseResponse: GetMonitoringStatusResponseDto,
  ): GetMonitoringStatusApiResponseDto {
    return {
      monitorings: useCaseResponse.monitorings,
    };
  }
}
