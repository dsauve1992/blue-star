export interface PricePointApiDto {
  date: string; // ISO string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalDataApiDto {
  symbol: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  pricePoints: PricePointApiDto[];
}

export interface GetHistoricalDataApiResponseDto {
  historicalData: HistoricalDataApiDto;
}
