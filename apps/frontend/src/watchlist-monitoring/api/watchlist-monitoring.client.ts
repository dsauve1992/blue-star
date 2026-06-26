import { apiClient } from "../../global/api/api-instance";

export type MonitoringType = "BREAKOUT" | "GAP";

export interface MonitoringStatus {
  watchlistId: string;
  type: MonitoringType;
  active: boolean;
}

export interface ActivateMonitoringRequest {
  type?: MonitoringType;
}

export interface ActivatedMonitoring {
  monitoringId: string;
  type: MonitoringType;
  active: boolean;
}

export interface ActivateMonitoringResponse {
  monitorings: ActivatedMonitoring[];
}

export interface DeactivateMonitoringRequest {
  type?: MonitoringType;
}

export interface DeactivatedMonitoring {
  type: MonitoringType;
  active: boolean;
}

export interface DeactivateMonitoringResponse {
  monitorings: DeactivatedMonitoring[];
}

export interface GetMonitoringStatusResponse {
  monitorings: MonitoringStatus[];
}

export class WatchlistMonitoringClient {
  async getMonitoringStatus(
    watchlistId: string,
  ): Promise<GetMonitoringStatusResponse> {
    const response = await apiClient.get<GetMonitoringStatusResponse>(
      `/watchlist-monitoring/${watchlistId}`,
    );
    return response.data;
  }

  async activateMonitoring(
    watchlistId: string,
    request: ActivateMonitoringRequest,
  ): Promise<ActivateMonitoringResponse> {
    const response = await apiClient.post<
      ActivateMonitoringResponse,
      ActivateMonitoringRequest
    >(`/watchlist-monitoring/${watchlistId}/activate`, request);
    return response.data;
  }

  async deactivateMonitoring(
    watchlistId: string,
    request: DeactivateMonitoringRequest,
  ): Promise<DeactivateMonitoringResponse> {
    const response = await apiClient.post<
      DeactivateMonitoringResponse,
      DeactivateMonitoringRequest
    >(`/watchlist-monitoring/${watchlistId}/deactivate`, request);
    return response.data;
  }
}
