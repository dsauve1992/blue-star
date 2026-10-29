import { Injectable, Inject } from '@nestjs/common';
import {
  ChartDataService,
  ChartData,
  ChartInterval,
} from '../../domain/services/chart-data.service';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { DateRange } from '../../../../shared/value-objects/date-range';
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

const SESSION_MINUTES = 390;
const NON_TRADING_DAYS_MARGIN = 4;

const sessionsToCalendarDays = (sessions: number) =>
  Math.ceil((sessions * 7) / 5) + NON_TRADING_DAYS_MARGIN;

const BARS_TO_DAYS: Record<ChartInterval, (bars: number) => number> = {
  '1': (bars) => sessionsToCalendarDays(bars / SESSION_MINUTES),
  '5': (bars) => sessionsToCalendarDays((bars * 5) / SESSION_MINUTES),
  '15': (bars) => sessionsToCalendarDays((bars * 15) / SESSION_MINUTES),
  '30': (bars) => sessionsToCalendarDays((bars * 30) / SESSION_MINUTES),
  '60': (bars) => sessionsToCalendarDays((bars * 60) / SESSION_MINUTES),
  D: (bars) => Math.ceil(bars * 1.5), // account for weekends
  W: (bars) => bars * 7,
  M: (bars) => bars * 31,
};

const MAX_DAYS_BACK: Partial<Record<ChartInterval, number>> = {
  '1': 7,
  '5': 59,
  '15': 59,
  '30': 59,
  '60': 729,
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
    const daysBack = Math.min(
      BARS_TO_DAYS[interval](bars),
      MAX_DAYS_BACK[interval] ?? Infinity,
    );

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
