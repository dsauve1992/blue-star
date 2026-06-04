import { apiClient } from '../../global/api/api-instance';
import type { MarketRegimeResponse } from './market-regime.types';

export class MarketRegimeClient {
  async getMarketRegime(): Promise<MarketRegimeResponse> {
    const response = await apiClient.get<MarketRegimeResponse>('/market-regime');
    return response.data;
  }
}
