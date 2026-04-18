import { Injectable } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import { Symbol } from '../../domain/value-objects/symbol';
import { DateRange } from '../../domain/value-objects/date-range';
import { PricePoint } from '../../domain/value-objects/price-point';
import {
  deduplicatePricePoints,
  determineInterval,
  HistoricalData,
  HistoricalDataFetchOptions,
  Interval,
  MarketDataService,
} from '../../domain/services/market-data.service';

@Injectable()
export class YahooMarketDataService implements MarketDataService {
  private readonly yahooFinance: InstanceType<typeof YahooFinance>;

  constructor() {
    this.yahooFinance = new YahooFinance();
  }

  async getHistoricalData(
    symbol: Symbol,
    dateRange: DateRange,
    _interval?: Interval,
    options?: HistoricalDataFetchOptions,
  ): Promise<HistoricalData> {
    const interval = _interval ?? determineInterval(dateRange);
    const fetchedPricePoints = await this.fetchViaChart(
      symbol,
      dateRange,
      interval,
      options,
    );
    const uniquePricePoints = deduplicatePricePoints(
      fetchedPricePoints,
      interval,
    );

    if (uniquePricePoints.length === 0) {
      throw new Error(`No historical data found for symbol ${symbol.value}`);
    }

    return {
      symbol,
      dateRange,
      pricePoints: uniquePricePoints,
    };
  }

  private async fetchViaChart(
    symbol: Symbol,
    dateRange: DateRange,
    interval: Interval,
    options?: HistoricalDataFetchOptions,
  ): Promise<PricePoint[]> {
    const result = await this.yahooFinance.chart(symbol.value, {
      period1: dateRange.startDate,
      period2: dateRange.endDate,
      interval,
      return: 'array',
      includePrePost: options?.includePrePost ?? true,
    });

    if (!result.quotes || result.quotes.length === 0) {
      return [];
    }

    const points: PricePoint[] = [];
    for (const q of result.quotes) {
      const open = q.open ?? q.close;
      const high = q.high ?? q.close;
      const low = q.low ?? q.close;
      const close = q.close;
      const volume = q.volume ?? 0;
      if (
        open != null &&
        high != null &&
        low != null &&
        close != null &&
        Number.isFinite(open) &&
        Number.isFinite(high) &&
        Number.isFinite(low) &&
        Number.isFinite(close)
      ) {
        points.push(
          PricePoint.of(new Date(q.date), open, high, low, close, volume),
        );
      }
    }
    return points;
  }
}
