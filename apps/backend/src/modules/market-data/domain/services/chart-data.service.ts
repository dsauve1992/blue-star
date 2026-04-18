import { PricePoint } from '../value-objects/price-point';

export type ChartInterval = '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M';

export interface ChartData {
  symbol: string;
  exchange: string;
  interval: ChartInterval;
  pricePoints: PricePoint[];
}

export interface ChartDataService {
  getChartData(
    symbol: string,
    exchange: string,
    interval: ChartInterval,
    bars: number,
    includeExtendedHours?: boolean,
  ): Promise<ChartData>;
}
