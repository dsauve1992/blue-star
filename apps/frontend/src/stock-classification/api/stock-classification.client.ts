import { apiClient } from "../../global/api/api-instance";

export interface StockClassificationResponse {
  symbol: string;
  industryGroup: string | null;
}

export class StockClassificationClient {
  async getStockClassification(
    symbol: string,
  ): Promise<StockClassificationResponse> {
    const response = await apiClient.get<StockClassificationResponse>(
      `/stock-classification/${encodeURIComponent(symbol)}`,
    );
    return response.data;
  }
}
