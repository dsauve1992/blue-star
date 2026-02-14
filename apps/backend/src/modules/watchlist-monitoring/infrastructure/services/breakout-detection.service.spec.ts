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

  it('should return detected false when price points are empty', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const data = historicalData([]);
    marketDataService.getHistoricalData.mockResolvedValue(data);
    const result = await service.detect(ticker);
    expect(result.ticker).toEqual(ticker);
    expect(result.detected).toBe(false);
  });

  it('should fetch intraday market data internally', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    marketDataService.getHistoricalData.mockResolvedValue(historicalData([]));
    await service.detect(ticker);
    expect(marketDataService.getHistoricalData).toHaveBeenCalledTimes(1);
    const [symbol, dateRange, interval] =
      marketDataService.getHistoricalData.mock.calls[0];
    expect(symbol).toEqual(Symbol.of('AAPL'));
    expect(dateRange).toBeInstanceOf(DateRange);
    expect(interval).toBe('5m');
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

  it('should return detected true when crossover and both indicators rising', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const base = new Date('2025-02-14T14:30:00.000Z');
    const closes = [100, 102, 104, 106, 108, 110, 112, 114, 116, 118];
    const bars: PricePoint[] = closes.map((close, i) => {
      const date = new Date(base.getTime() + i * 5 * 60 * 1000);
      return PricePoint.of(date, close, close, close, close, 1000);
    });
    const data = historicalData(bars);
    marketDataService.getHistoricalData.mockResolvedValue(data);
    const result = await service.detect(ticker);
    expect(result.ticker).toEqual(ticker);
    expect(result.detected).toBe(true);
  });
});
