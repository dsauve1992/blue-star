import { Test, TestingModule } from '@nestjs/testing';
import { BreakoutDetectionServiceImpl } from './breakout-detection.service';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';
import type {
  HistoricalData,
  MarketDataService,
} from '../../../market-data/domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../../market-data/constants/tokens';

describe('BreakoutDetectionServiceImpl', () => {
  let service: BreakoutDetectionServiceImpl;
  let marketDataService: jest.Mocked<MarketDataService>;

  beforeEach(async () => {
    marketDataService = {
      getHistoricalData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BreakoutDetectionServiceImpl,
        {
          provide: MARKET_DATA_SERVICE,
          useValue: marketDataService,
        },
      ],
    }).compile();

    service = module.get(BreakoutDetectionServiceImpl);
  });

  function pricePoint(
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number,
    close: number,
    volume: number,
  ): PricePoint {
    const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    return PricePoint.of(date, close, close, close, close, volume);
  }

  function historicalData(pricePoints: PricePoint[]): HistoricalData {
    const start = new Date('2020-01-01');
    const end = new Date('2020-01-02');
    return {
      symbol: Symbol.of('AAPL'),
      dateRange: DateRange.of(start, end),
      pricePoints,
    };
  }

  function buildSessionBars(
    day: number,
    closes: number[],
    volume: number,
  ): PricePoint[] {
    const sessionStart = new Date(Date.UTC(2025, 1, day, 14, 30));
    return closes.map((close, index) => {
      const barDate = new Date(sessionStart.getTime() + index * 5 * 60 * 1000);
      return PricePoint.of(barDate, close, close, close, close, volume);
    });
  }

  it('should return detected false when price points are empty', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const data = historicalData([]);
    marketDataService.getHistoricalData.mockResolvedValue(data);
    const result = await service.detect(ticker);
    expect(result.ticker).toEqual(ticker);
    expect(result.detected).toBe(false);
  });

  it('should fetch intraday market data with a 30-day lookback from the given now', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const now = new Date('2025-02-14T16:00:00.000Z');
    marketDataService.getHistoricalData.mockResolvedValue(historicalData([]));
    await service.detect(ticker, now);
    expect(marketDataService.getHistoricalData).toHaveBeenNthCalledWith(
      1,
      Symbol.of('AAPL'),
      // 30 days back from Feb 14 = Jan 15, market open at 14:30 UTC (winter)
      DateRange.of(new Date('2025-01-15T14:30:00.000Z'), now),
      '5m',
    );
  });

  it('should filter out bars outside market hours', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // 14:00 UTC in winter = 9:00 AM Toronto (before 9:30 open)
    const preMarketBar = pricePoint(2025, 2, 14, 14, 0, 100, 1000);
    // 21:30 UTC in winter = 4:30 PM Toronto (after 4:00 close)
    const afterHoursBar = pricePoint(2025, 2, 14, 21, 30, 100, 1000);
    // Only one bar within market hours -> should return detected false
    const marketBar = pricePoint(2025, 2, 14, 14, 35, 100, 1000);
    const data = historicalData([preMarketBar, marketBar, afterHoursBar]);
    marketDataService.getHistoricalData.mockResolvedValue(data);
    const result = await service.detect(ticker);
    expect(result.detected).toBe(false);
  });

  it('should return detected false when only one bar in session', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const bars = [pricePoint(2025, 2, 14, 14, 35, 100, 1000)];
    const data = historicalData(bars);
    marketDataService.getHistoricalData.mockResolvedValue(data);
    const result = await service.detect(ticker);
    expect(result.detected).toBe(false);
  });

  it('should return detected false when no crossover (EMA9 below VWAP)', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const base = new Date('2025-02-14T14:30:00.000Z');
    const bars: PricePoint[] = [];
    for (let i = 0; i < 10; i++) {
      const date = new Date(base.getTime() + i * 5 * 60 * 1000);
      const close = 120 - i;
      bars.push(PricePoint.of(date, close, close, close, close, 1000));
    }
    const data = historicalData(bars);
    marketDataService.getHistoricalData.mockResolvedValue(data);
    const result = await service.detect(ticker);
    expect(result.detected).toBe(false);
  });

  it('should return detected false when VWAP not rising', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const base = new Date('2025-02-14T14:30:00.000Z');
    const bars: PricePoint[] = [];
    for (let i = 0; i < 10; i++) {
      const date = new Date(base.getTime() + i * 5 * 60 * 1000);
      const close = 100 + i * 2;
      bars.push(
        PricePoint.of(date, close, close, close, close, i < 9 ? 100 : 10000),
      );
    }
    const data = historicalData(bars);
    marketDataService.getHistoricalData.mockResolvedValue(data);
    const result = await service.detect(ticker);
    expect(result.detected).toBe(false);
  });

  it('should return detected true on fresh crossover with both indicators rising', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const priorSessionCloses = new Array(10).fill(100);
    const currentSessionCloses = [
      100, 100, 100, 100, 100, 100, 100, 100, 100, 105,
    ];
    const bars: PricePoint[] = [];

    for (let day = 1; day <= 10; day++) {
      bars.push(...buildSessionBars(day, priorSessionCloses, 100));
    }
    bars.push(...buildSessionBars(11, currentSessionCloses, 250));

    const data = historicalData(bars);
    marketDataService.getHistoricalData.mockResolvedValue(data);
    const result = await service.detect(ticker);
    expect(result.ticker).toEqual(ticker);
    expect(result.detected).toBe(true);
  });

  it('should return detected false when crossover is not fresh', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const priorSessionCloses = new Array(10).fill(100);
    const currentSessionCloses = [
      100, 102, 104, 106, 108, 110, 112, 114, 116, 118,
    ];
    const bars: PricePoint[] = [];

    for (let day = 1; day <= 10; day++) {
      bars.push(...buildSessionBars(day, priorSessionCloses, 100));
    }
    bars.push(...buildSessionBars(11, currentSessionCloses, 250));

    const data = historicalData(bars);
    marketDataService.getHistoricalData.mockResolvedValue(data);

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should return detected false when cumulative volume is below 1.5x lookback average', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const priorSessionCloses = new Array(10).fill(100);
    const currentSessionCloses = [
      100, 100, 100, 100, 100, 100, 100, 100, 100, 105,
    ];
    const bars: PricePoint[] = [];

    for (let day = 1; day <= 10; day++) {
      bars.push(...buildSessionBars(day, priorSessionCloses, 100));
    }
    bars.push(...buildSessionBars(11, currentSessionCloses, 120));

    const data = historicalData(bars);
    marketDataService.getHistoricalData.mockResolvedValue(data);

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });
});
