import { apiClient } from "../../global/api/api-instance";

export interface ChartCandleDto {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartDataDto {
  symbol: string;
  exchange: string;
  interval: string;
  candles: ChartCandleDto[];
}

export interface GetChartDataResponse {
  chartData: ChartDataDto;
}

export type ChartInterval = "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M";

/** Timeframe buttons on watchlist and consolidation charts. */
export const MAIN_CHART_TIMEFRAME_OPTIONS: ChartInterval[] = [
  "5",
  "15",
  "60",
  "D",
  "W",
];

export class ChartDataClient {
  async getChartData(
    symbol: string,
    exchange: string,
    interval: ChartInterval = "D",
    bars: number = 200,
  ): Promise<GetChartDataResponse> {
    const response = await apiClient.get<GetChartDataResponse>(
      `/market-data/chart`,
      {
        params: { symbol, exchange, interval, bars },
      },
    );
    return response.data;
  }
}
