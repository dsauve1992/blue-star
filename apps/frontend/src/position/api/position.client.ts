import { apiClient } from "../../global/api/api-instance";

export interface OpenPositionRequest {
  portfolioId: string;
  instrument: string;
  quantity: number;
  price: number;
  timestamp: string;
  note?: string;
}

export interface OpenPositionResponse {
  positionId: string;
}

export interface SetStopLossRequest {
  stopPrice: number;
  timestamp: string;
  note?: string;
}

export interface SetStopLossResponse {
  positionId: string;
}

export interface SellSharesRequest {
  quantity: number;
  price: number;
  timestamp: string;
  note?: string;
}

export interface SellSharesResponse {
  positionId: string;
  remainingQuantity: number;
  isClosed: boolean;
}

export interface BuySharesRequest {
  quantity: number;
  price: number;
  timestamp: string;
  note?: string;
}

export interface BuySharesResponse {
  positionId: string;
  totalQuantity: number;
}

export class PositionClient {
  async openPosition(
    request: OpenPositionRequest,
  ): Promise<OpenPositionResponse> {
    const response = await apiClient.post<
      OpenPositionResponse,
      OpenPositionRequest
    >("/positions", request);
    return response.data;
  }

  async setStopLoss(
    positionId: string,
    request: SetStopLossRequest,
  ): Promise<SetStopLossResponse> {
    const response = await apiClient.put<
      SetStopLossResponse,
      SetStopLossRequest
    >(`/positions/${positionId}/stop-loss`, request);
    return response.data;
  }

  async sellShares(
    positionId: string,
    request: SellSharesRequest,
  ): Promise<SellSharesResponse> {
    const response = await apiClient.put<SellSharesResponse, SellSharesRequest>(
      `/positions/${positionId}/sell`,
      request,
    );
    return response.data;
  }

  async buyShares(
    positionId: string,
    request: BuySharesRequest,
  ): Promise<BuySharesResponse> {
    const response = await apiClient.put<BuySharesResponse, BuySharesRequest>(
      `/positions/${positionId}/buy`,
      request,
    );
    return response.data;
  }
}
