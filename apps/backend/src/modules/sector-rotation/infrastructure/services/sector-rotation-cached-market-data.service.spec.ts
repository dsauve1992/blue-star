import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import type {
  HistoricalData,
  MarketDataService,
} from '../../../market-data/domain/services/market-data.service';
import type { MarketDataCacheRepository } from '../../../market-data/domain/repositories/market-data-cache.repository.interface';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { SectorRotationCachedMarketDataService } from './sector-rotation-cached-market-data.service';

describe('SectorRotationCachedMarketDataService', () => {
  let service: SectorRotationCachedMarketDataService;
  let marketDataService: jest.Mocked<MarketDataService>;
  let cacheRepository: jest.Mocked<MarketDataCacheRepository>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-02-04T12:00:00.000Z'));

    marketDataService = {
      getHistoricalData: jest.fn(),
    };

    cacheRepository = {
      findBySymbolAndDateRange: jest.fn(),
      savePricePoints: jest.fn(),
    };

    service = new SectorRotationCachedMarketDataService(
      marketDataService,
      cacheRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function point(date: string, close: number): PricePoint {
    return PricePoint.of(
      new Date(date),
      close - 1,
      close + 1,
      close - 2,
      close,
      1000,
    );
  }

  function historicalData(
    symbol: Symbol,
    dateRange: DateRange,
    pricePoints: PricePoint[],
  ): HistoricalData {
    return {
      symbol,
      dateRange,
      pricePoints,
    };
  }

  it('should return cached weekly data without fetching when cache is complete and fresh', async () => {
    const symbol = Symbol.of('XLK');
    const dateRange = DateRange.of(
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-31T00:00:00.000Z'),
    );
    const cachedPricePoints = [
      point('2025-01-01T00:00:00.000Z', 100),
      point('2025-01-08T00:00:00.000Z', 101),
      point('2025-01-15T00:00:00.000Z', 102),
      point('2025-01-22T00:00:00.000Z', 103),
      point('2025-01-29T00:00:00.000Z', 104),
    ];
    cacheRepository.findBySymbolAndDateRange.mockResolvedValue(
      cachedPricePoints,
    );

    const result = await service.getHistoricalData(symbol, dateRange, '1wk');

    expect(cacheRepository.findBySymbolAndDateRange).toHaveBeenNthCalledWith(
      1,
      symbol,
      dateRange.startDate,
      dateRange.endDate,
      '1wk',
    );
    expect(marketDataService.getHistoricalData).not.toHaveBeenCalled();
    expect(result).toEqual(
      historicalData(symbol, dateRange, cachedPricePoints),
    );
  });

  it('should fetch and persist weekly data when the cache is incomplete', async () => {
    const symbol = Symbol.of('XLF');
    const dateRange = DateRange.of(
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-31T00:00:00.000Z'),
    );
    const cachedPricePoints = [
      point('2025-01-01T00:00:00.000Z', 200),
      point('2025-01-08T00:00:00.000Z', 201),
    ];
    const fetchedPricePoints = [
      point('2025-01-15T00:00:00.000Z', 202),
      point('2025-01-22T00:00:00.000Z', 203),
      point('2025-01-29T00:00:00.000Z', 204),
    ];
    cacheRepository.findBySymbolAndDateRange.mockResolvedValue(
      cachedPricePoints,
    );
    marketDataService.getHistoricalData.mockResolvedValue(
      historicalData(symbol, dateRange, fetchedPricePoints),
    );

    const result = await service.getHistoricalData(symbol, dateRange, '1wk');

    expect(marketDataService.getHistoricalData).toHaveBeenNthCalledWith(
      1,
      symbol,
      dateRange,
      '1wk',
      undefined,
    );
    expect(cacheRepository.savePricePoints).toHaveBeenNthCalledWith(
      1,
      symbol,
      fetchedPricePoints,
      '1wk',
    );
    expect(result).toEqual(
      historicalData(symbol, dateRange, [
        ...cachedPricePoints,
        ...fetchedPricePoints,
      ]),
    );
  });

  it('should return stale cache data when fetch fails but partial cache exists', async () => {
    const symbol = Symbol.of('XLV');
    const dateRange = DateRange.of(
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-31T00:00:00.000Z'),
    );
    const cachedPricePoints = [
      point('2025-01-01T00:00:00.000Z', 150),
      point('2025-01-08T00:00:00.000Z', 151),
    ];
    cacheRepository.findBySymbolAndDateRange.mockResolvedValue(
      cachedPricePoints,
    );
    marketDataService.getHistoricalData.mockRejectedValue(
      new Error('Network error'),
    );

    const result = await service.getHistoricalData(symbol, dateRange, '1wk');

    expect(result.pricePoints).toEqual(cachedPricePoints);
  });

  it('should throw when fetch fails and cache is empty', async () => {
    const symbol = Symbol.of('XLE');
    const dateRange = DateRange.of(
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-31T00:00:00.000Z'),
    );
    cacheRepository.findBySymbolAndDateRange.mockResolvedValue([]);
    marketDataService.getHistoricalData.mockRejectedValue(
      new Error('Network error'),
    );

    await expect(
      service.getHistoricalData(symbol, dateRange, '1wk'),
    ).rejects.toThrow(
      `Failed to fetch historical data for ${symbol.value} and no cached data available`,
    );
  });

  it('should re-fetch when cache is stale', async () => {
    const symbol = Symbol.of('XLB');
    const dateRange = DateRange.of(
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-31T00:00:00.000Z'),
    );
    // Latest cached point is 10 days ago — exceeds 7-day staleness for '1wk'
    const stalePoint = point('2025-01-25T00:00:00.000Z', 200);
    const freshPoints = [
      point('2025-01-01T00:00:00.000Z', 200),
      point('2025-01-08T00:00:00.000Z', 201),
      point('2025-01-15T00:00:00.000Z', 202),
      point('2025-01-22T00:00:00.000Z', 203),
      point('2025-01-29T00:00:00.000Z', 204),
    ];
    cacheRepository.findBySymbolAndDateRange.mockResolvedValue([stalePoint]);
    marketDataService.getHistoricalData.mockResolvedValue(
      historicalData(symbol, dateRange, freshPoints),
    );

    await service.getHistoricalData(symbol, dateRange, '1wk');

    expect(marketDataService.getHistoricalData).toHaveBeenCalled();
    expect(cacheRepository.savePricePoints).toHaveBeenCalled();
  });

  it('should bypass cache for non-cacheable intervals like 3mo', async () => {
    const symbol = Symbol.of('SPY');
    const dateRange = DateRange.of(
      new Date('2024-01-01T00:00:00.000Z'),
      new Date('2025-01-01T00:00:00.000Z'),
    );
    const points = [point('2024-04-01T00:00:00.000Z', 500)];
    marketDataService.getHistoricalData.mockResolvedValue(
      historicalData(symbol, dateRange, points),
    );

    const result = await service.getHistoricalData(symbol, dateRange, '3mo');

    expect(cacheRepository.findBySymbolAndDateRange).not.toHaveBeenCalled();
    expect(result.pricePoints).toEqual(points);
  });

  it('should bypass cache for intraday intervals', async () => {
    const symbol = Symbol.of('QQQ');
    const dateRange = DateRange.of(
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-02T00:00:00.000Z'),
    );
    const intradayPoints = [
      point('2025-01-02T14:30:00.000Z', 300),
      point('2025-01-02T14:35:00.000Z', 301),
    ];
    marketDataService.getHistoricalData.mockResolvedValue(
      historicalData(symbol, dateRange, intradayPoints),
    );

    const result = await service.getHistoricalData(symbol, dateRange, '5m');

    expect(cacheRepository.findBySymbolAndDateRange).not.toHaveBeenCalled();
    expect(cacheRepository.savePricePoints).not.toHaveBeenCalled();
    expect(marketDataService.getHistoricalData).toHaveBeenNthCalledWith(
      1,
      symbol,
      dateRange,
      '5m',
      undefined,
    );
    expect(result).toEqual(historicalData(symbol, dateRange, intradayPoints));
  });
});
