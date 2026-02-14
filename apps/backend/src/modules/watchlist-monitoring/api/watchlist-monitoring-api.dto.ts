import { MonitoringType } from '../domain/value-objects/monitoring-type';

export interface MonitoringStatusApiDto {
  watchlistId: string;
  type: MonitoringType;
  active: boolean;
}

export interface ActivateMonitoringApiResponseDto {
  monitoringId: string;
  active: boolean;
}

export interface DeactivateMonitoringApiResponseDto {
  active: boolean;
}

export interface GetMonitoringStatusApiResponseDto {
  monitorings: MonitoringStatusApiDto[];
}
