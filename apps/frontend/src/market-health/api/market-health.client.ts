import { apiClient } from '../../global/api/api-instance';
import type { MarketHealthResponse } from './market-health.types';

export class MarketHealthClient {
  async getMarketHealth(): Promise<MarketHealthResponse> {
    const response = await apiClient.get<MarketHealthResponse>('/market-health');
    return response.data;
  }
}
