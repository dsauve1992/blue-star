import { Injectable, Inject } from '@nestjs/common';
import YahooFinance from 'yahoo-finance2';
import { Symbol } from '../../domain/value-objects/symbol';
import { DateRange } from '../../domain/value-objects/date-range';
import { PricePoint } from '../../domain/value-objects/price-point';
import {
  HistoricalData,
  Interval,
  isHistoricalApiInterval,
  isIntradayInterval,
  MarketDataService,
} from '../../domain/services/market-data.service';
import { MarketDataCacheRepository } from '../../domain/repositories/market-data-cache.repository.interface';
import { MARKET_DATA_CACHE_REPOSITORY } from '../../constants/tokens';

@Injectable()
export class YahooMarketDataService implements MarketDataService {
  private readonly yahooFinance: InstanceType<typeof YahooFinance>;

  constructor(
    @Inject(MARKET_DATA_CACHE_REPOSITORY)
    private readonly cacheRepository: MarketDataCacheRepository,
  ) {
    this.yahooFinance = new YahooFinance();
  }

  async getHistoricalData(
    symbol: Symbol,
    dateRange: DateRange,
    _interval?: Interval,
  ): Promise<HistoricalData> {
    const interval = _interval ?? this.determineInterval(dateRange);
    const useCache = isHistoricalApiInterval(interval);
    let cachedPricePoints: PricePoint[] = [];
    if (useCache) {
      cachedPricePoints = await this.cacheRepository.findBySymbolAndDateRange(
        symbol,
        dateRange.startDate,
        dateRange.endDate,
        interval,
      );
    }

    const hasCompleteCache =
      useCache && this.isCacheComplete(cachedPricePoints, dateRange, interval);

    let fetchedPricePoints: PricePoint[] = [];

    if (!hasCompleteCache) {
      try {
        if (useCache) {
          fetchedPricePoints = await this.fetchViaHistorical(
            symbol,
            dateRange,
            interval as '1d' | '1wk' | '1mo',
          );
          if (fetchedPricePoints.length > 0) {
            await this.cacheRepository.savePricePoints(
              symbol,
              fetchedPricePoints,
              interval,
            );
          }
        } else {
          fetchedPricePoints = await this.fetchViaChart(
            symbol,
            dateRange,
            interval,
          );
        }
      } catch (error) {
        console.error(
          `Failed to fetch historical data for ${symbol.value}:`,
          error,
        );
        if (cachedPricePoints.length === 0) {
          throw new Error(
            `Failed to fetch historical data for ${symbol.value} and no cached data available`,
          );
        }
      }
    }

    const allPricePoints = [...cachedPricePoints, ...fetchedPricePoints]
      .filter((point) => {
        const pointTime = point.date.getTime();
        return (
          pointTime >= dateRange.startDate.getTime() &&
          pointTime <= dateRange.endDate.getTime()
        );
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const uniquePricePoints = this.deduplicatePricePoints(
      allPricePoints,
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
  ): Promise<PricePoint[]> {
    const result = await this.yahooFinance.chart(symbol.value, {
      period1: dateRange.startDate,
      period2: dateRange.endDate,
      interval,
      return: 'array',
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

  private async fetchViaHistorical(
    symbol: Symbol,
    dateRange: DateRange,
    interval: '1d' | '1wk' | '1mo',
  ): Promise<PricePoint[]> {
    const result = await this.yahooFinance.historical(symbol.value, {
      period1: dateRange.startDate,
      period2: dateRange.endDate,
      interval,
    });

    if (!result || result.length === 0) {
      return [];
    }

    return result.map((data) =>
      PricePoint.of(
        new Date(data.date),
        data.open,
        data.high,
        data.low,
        data.close,
        data.volume || 0,
      ),
    );
  }

  private isCacheComplete(
    cachedPricePoints: PricePoint[],
    dateRange: DateRange,
    interval: Interval,
  ): boolean {
    if (cachedPricePoints.length === 0 || !isHistoricalApiInterval(interval)) {
      return false;
    }

    const sortedCache = [...cachedPricePoints].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    const earliestCachedDate = sortedCache[0].date;
    const latestCachedDate = sortedCache[sortedCache.length - 1].date;

    const startDateTime = dateRange.startDate.getTime();
    const endDateTime = dateRange.endDate.getTime();

    if (earliestCachedDate.getTime() > startDateTime) {
      return false;
    }

    const now = new Date();

    let maxStalenessDays: number;
    if (interval === '1d') {
      maxStalenessDays = 3;
    } else if (interval === '1wk') {
      maxStalenessDays = 7;
    } else {
      maxStalenessDays = 30;
    }

    const daysSinceLatestCache = Math.floor(
      (now.getTime() - latestCachedDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceLatestCache > maxStalenessDays) {
      return false;
    }

    const latestCacheTime = latestCachedDate.getTime();
    if (latestCacheTime < endDateTime) {
      const daysGap = Math.floor(
        (endDateTime - latestCacheTime) / (1000 * 60 * 60 * 24),
      );
      if (daysGap > maxStalenessDays) {
        return false;
      }
    }

    return true;
  }

  private deduplicatePricePoints(
    pricePoints: PricePoint[],
    interval: Interval,
  ): PricePoint[] {
    const seen = new Set<string>();
    const unique: PricePoint[] = [];
    const useTimestampKey = isIntradayInterval(interval);

    for (const point of pricePoints) {
      const key = useTimestampKey
        ? point.date.getTime().toString()
        : point.date.toISOString().split('T')[0];
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(point);
      }
    }

    return unique;
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
