import { MonitoringType } from '../domain/value-objects/monitoring-type';

export interface MonitoringStatusApiDto {
  watchlistId: string;
  type: MonitoringType;
  active: boolean;
}

export interface ActivatedMonitoringApiDto {
  monitoringId: string;
  type: MonitoringType;
  active: boolean;
}

export interface ActivateMonitoringApiResponseDto {
  monitorings: ActivatedMonitoringApiDto[];
}

export interface DeactivatedMonitoringApiDto {
  type: MonitoringType;
  active: boolean;
}

export interface DeactivateMonitoringApiResponseDto {
  monitorings: DeactivatedMonitoringApiDto[];
}

export interface GetMonitoringStatusApiResponseDto {
  monitorings: MonitoringStatusApiDto[];
}
