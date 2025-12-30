import { Injectable } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import { Symbol } from '../../domain/value-objects/symbol';
import { DateRange } from '../../domain/value-objects/date-range';
import { PricePoint } from '../../domain/value-objects/price-point';
import {
  HistoricalData,
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
  ): Promise<HistoricalData> {
    try {
      const query = symbol.value;
      const period1 = dateRange.startDate;
      const period2 = dateRange.endDate;
      const interval = _interval ?? this.determineInterval(dateRange);

      const result = await this.yahooFinance.historical(query, {
        period1,
        period2,
        interval,
      });

      if (!result || result.length === 0) {
        throw new Error(`No historical data found for symbol ${symbol.value}`);
      }

      const pricePoints = result.map((data) => {
        return PricePoint.of(
          new Date(data.date),
          data.open,
          data.high,
          data.low,
          data.close,
          data.volume || 0,
        );
      });

      return {
        symbol,
        dateRange,
        pricePoints,
      };
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to fetch historical data for ${symbol.value}`);
    }
  }

  private determineInterval(dateRange: DateRange): Interval {
    const days = dateRange.getDaysDifference();

    if (days <= 90) {
      return '1d'; // Daily data for up to 3 months
    } else if (days <= 365) {
      return '1wk'; // Weekly data for up to 1 year
    } else {
      return '1mo'; // Monthly data for longer periods
    }
  }
}
