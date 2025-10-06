import { apiClient } from "../../global/api/api-instance";

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalData {
  symbol: string;
  startDate: string;
  endDate: string;
  pricePoints: PricePoint[];
}

export interface GetHistoricalDataResponse {
  historicalData: HistoricalData;
}

export class MarketDataClient {
  async getHistoricalData(
    symbol: string,
    startDate: string,
    endDate: string,
  ): Promise<GetHistoricalDataResponse> {
    const response = await apiClient.get<GetHistoricalDataResponse>(
      `/market-data/historical`,
      {
        params: {
          symbol: symbol,
          startDate: startDate,
          endDate: endDate,
        },
      },
    );
    return response.data;
  }
}
