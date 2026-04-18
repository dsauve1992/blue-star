import { Injectable, Inject } from '@nestjs/common';
import {
  ChartDataService,
  ChartData,
  ChartInterval,
} from '../../domain/services/chart-data.service';
import { Symbol } from '../../domain/value-objects/symbol';
import { DateRange } from '../../domain/value-objects/date-range';
import {
  MarketDataService,
  Interval,
} from '../../domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../constants/tokens';

const CHART_TO_YAHOO_INTERVAL: Record<ChartInterval, Interval> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '60m',
  D: '1d',
  W: '1wk',
  M: '1mo',
};

const BARS_TO_DAYS: Record<ChartInterval, (bars: number) => number> = {
  '1': (bars) => Math.ceil(bars / 390), // ~390 1-min bars per day
  '5': (bars) => Math.ceil((bars * 5) / 390),
  '15': (bars) => Math.ceil((bars * 15) / 390),
  '30': (bars) => Math.ceil((bars * 30) / 390),
  '60': (bars) => Math.ceil((bars * 60) / 390),
  D: (bars) => Math.ceil(bars * 1.5), // account for weekends
  W: (bars) => bars * 7,
  M: (bars) => bars * 31,
};

@Injectable()
export class YahooChartDataService implements ChartDataService {
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
  ) {}

  async getChartData(
    symbol: string,
    exchange: string,
    interval: ChartInterval,
    bars: number,
    includeExtendedHours = true,
  ): Promise<ChartData> {
    const yahooInterval = CHART_TO_YAHOO_INTERVAL[interval];
    const daysBack = BARS_TO_DAYS[interval](bars);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const symbolVO = Symbol.of(symbol);
    const dateRange = DateRange.of(startDate, endDate);

    const historicalData = await this.marketDataService.getHistoricalData(
      symbolVO,
      dateRange,
      yahooInterval,
      { includePrePost: includeExtendedHours },
    );

    // Take only the last N bars requested
    const pricePoints = historicalData.pricePoints.slice(-bars);

    return {
      symbol,
      exchange,
      interval,
      pricePoints,
    };
  }
}
