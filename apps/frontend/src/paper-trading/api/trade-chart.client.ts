import { apiClient } from "../../global/api/api-instance";
import type { ChartCandleDto } from "../../market-data/api/chart-data.client";

interface PricePointApiDto {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface HistoricalDataApiDto {
  symbol: string;
  startDate: string;
  endDate: string;
  pricePoints: PricePointApiDto[];
}

interface GetHistoricalDataApiResponse {
  historicalData: HistoricalDataApiDto;
}

function extractSymbol(ticker: string): string {
  const parts = ticker.split(":");
  return parts.length > 1 ? parts[1] : parts[0];
}

export class TradeChartClient {
  async getDaily(
    ticker: string,
    startDate: string,
    endDate: string,
  ): Promise<ChartCandleDto[]> {
    const response = await apiClient.get<GetHistoricalDataApiResponse>(
      "/market-data/historical",
      {
        params: { symbol: extractSymbol(ticker), startDate, endDate },
      },
    );
    return response.data.historicalData.pricePoints.map((point) => ({
      time: point.date.slice(0, 10),
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    }));
  }

  async getIntraday(
    ticker: string,
    startDate: string,
    endDate: string,
    interval: string = "5m",
  ): Promise<ChartCandleDto[]> {
    const response = await apiClient.get<GetHistoricalDataApiResponse>(
      "/market-data/intraday",
      {
        params: {
          symbol: extractSymbol(ticker),
          startDate,
          endDate,
          interval,
          includeExtendedHours: false,
        },
      },
    );
    return response.data.historicalData.pricePoints.map((point) => ({
      time: Math.floor(new Date(point.date).getTime() / 1000),
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
    }));
  }
}
