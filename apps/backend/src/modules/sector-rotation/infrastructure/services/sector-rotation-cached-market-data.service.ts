import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MARKET_DATA_CACHE_REPOSITORY,
  MARKET_DATA_SERVICE,
} from '../../../market-data/constants/tokens';
import type { MarketDataCacheRepository } from '../../../market-data/domain/repositories/market-data-cache.repository.interface';
import type {
  HistoricalData,
  Interval,
  MarketDataService,
} from '../../../market-data/domain/services/market-data.service';
import {
  deduplicatePricePoints,
  determineInterval,
  isCacheableHistoricalInterval,
} from '../../../market-data/domain/services/market-data.service';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';

@Injectable()
export class SectorRotationCachedMarketDataService
  implements MarketDataService
{
  private readonly logger = new Logger(
    SectorRotationCachedMarketDataService.name,
  );

  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
    @Inject(MARKET_DATA_CACHE_REPOSITORY)
    private readonly cacheRepository: MarketDataCacheRepository,
  ) {}

  async getHistoricalData(
    symbol: Symbol,
    dateRange: DateRange,
    _interval?: Interval,
  ): Promise<HistoricalData> {
    const interval = _interval ?? determineInterval(dateRange);

    if (!isCacheableHistoricalInterval(interval)) {
      return this.marketDataService.getHistoricalData(
        symbol,
        dateRange,
        interval,
      );
    }

    const cachedPricePoints =
      await this.cacheRepository.findBySymbolAndDateRange(
        symbol,
        dateRange.startDate,
        dateRange.endDate,
        interval,
      );
    const hasCompleteCache = this.isCacheComplete(
      cachedPricePoints,
      dateRange,
      interval,
    );

    let fetchedPricePoints: PricePoint[] = [];

    if (!hasCompleteCache) {
      try {
        const historicalData = await this.marketDataService.getHistoricalData(
          symbol,
          dateRange,
          interval,
        );
        fetchedPricePoints = historicalData.pricePoints;

        if (fetchedPricePoints.length > 0) {
          await this.cacheRepository.savePricePoints(
            symbol,
            fetchedPricePoints,
            interval,
          );
        }
      } catch (error) {
        this.logger.error(
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

    const uniquePricePoints = deduplicatePricePoints(allPricePoints, interval);

    if (uniquePricePoints.length === 0) {
      throw new Error(`No historical data found for symbol ${symbol.value}`);
    }

    return {
      symbol,
      dateRange,
      pricePoints: uniquePricePoints,
    };
  }

  private isCacheComplete(
    cachedPricePoints: PricePoint[],
    dateRange: DateRange,
    interval: '1d' | '1wk' | '1mo',
  ): boolean {
    if (cachedPricePoints.length === 0) {
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

    const maxStalenessDays = this.maxStalenessDaysFor(interval);
    const now = new Date();
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

  private maxStalenessDaysFor(interval: '1d' | '1wk' | '1mo'): number {
    if (interval === '1d') {
      return 3;
    }
    if (interval === '1wk') {
      return 7;
    }
    return 30;
  }
}
