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

  function historicalData(pricePoints: PricePoint[]): HistoricalData {
    const start = new Date('2020-01-01');
    const end = new Date('2020-01-02');
    return {
      symbol: Symbol.of('AAPL'),
      dateRange: DateRange.of(start, end),
      pricePoints,
    };
  }

  /**
   * Builds a full session of 5-min bars starting at 14:30 UTC (9:30 AM ET).
   * All bars are flat (open=high=low=close) so typical price = close.
   * day is the day-of-month within February 2025.
   */
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

  /**
   * Builds the standard setup that satisfies all breakout conditions:
   * - 10 prior sessions (baseline) with flat closes and normal volume
   * - 1 current session with flat price then a spike on the last bar
   *
   * Prior sessions use closes=priorClose and volume=priorVolume.
   * Current session uses the provided closes and volume.
   */
  function buildBreakoutScenario(options: {
    priorClose?: number;
    priorVolume?: number;
    currentCloses?: number[];
    currentVolume?: number;
    priorSessionCount?: number;
  }): PricePoint[] {
    const {
      priorClose = 100,
      priorVolume = 100,
      currentCloses = [100, 100, 100, 100, 100, 100, 100, 100, 100, 105],
      currentVolume = 250,
      priorSessionCount = 10,
    } = options;

    const bars: PricePoint[] = [];
    for (let day = 1; day <= priorSessionCount; day++) {
      bars.push(
        ...buildSessionBars(day, new Array(10).fill(priorClose), priorVolume),
      );
    }
    bars.push(
      ...buildSessionBars(priorSessionCount + 1, currentCloses, currentVolume),
    );
    return bars;
  }

  it('should return detected false when price points are empty', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    marketDataService.getHistoricalData.mockResolvedValue(historicalData([]));

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
    const preMarketBar = PricePoint.of(
      new Date(Date.UTC(2025, 1, 14, 14, 0)),
      100,
      100,
      100,
      100,
      1000,
    );
    // 21:30 UTC in winter = 4:30 PM Toronto (after 4:00 close)
    const afterHoursBar = PricePoint.of(
      new Date(Date.UTC(2025, 1, 14, 21, 30)),
      100,
      100,
      100,
      100,
      1000,
    );
    // Only one market-hours bar → below EMA_MINIMUM_BARS → detected false
    const marketBar = PricePoint.of(
      new Date(Date.UTC(2025, 1, 14, 14, 35)),
      100,
      100,
      100,
      100,
      1000,
    );
    marketDataService.getHistoricalData.mockResolvedValue(
      historicalData([preMarketBar, marketBar, afterHoursBar]),
    );

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should return detected false when current session has fewer than 9 bars (EMA warm-up)', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // 8 bars — one short of the EMA(9) minimum warm-up requirement
    const bars = buildSessionBars(14, new Array(8).fill(100), 1000);
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should return detected false when current close does not exceed prior session high', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // Prior sessions trade at 110 (high = 110).
    // Current session climbs to 105 — still inside the prior session's range.
    const bars = buildBreakoutScenario({
      priorClose: 110,
      currentCloses: [100, 100, 100, 100, 100, 100, 100, 100, 100, 105],
      currentVolume: 250,
    });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should return detected false when cumulative volume is below the weighted baseline', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // All prior sessions flat at 100 vol/bar → weighted baseline = 1000.
    // Current cumulative: 10 × 99 = 990 < 1000 → no surge.
    const bars = buildBreakoutScenario({ currentVolume: 99 });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should return detected false when fewer than 10 prior sessions are available for volume baseline', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // Only 9 prior sessions — one short of the required lookback.
    const bars = buildBreakoutScenario({ priorSessionCount: 9 });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should return detected true when all breakout conditions are met', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // 10 prior sessions flat at 100 (high=100), volume 100/bar → cumulative baseline = 1000.
    // Current session: 9 bars at 100, last bar spikes to 105 with volume 250/bar.
    //   VWAP: (9×100×250 + 105×250) / (10×250) = 100.5
    //   EMA(9): 105×0.2 + 100×0.8 = 101  →  spread ≈ 0.50% ✓
    //   Prior session high: 100 → 105 > 100 ✓
    //   Volume: 2500 >= 1000 (weighted baseline) ✓
    const bars = buildBreakoutScenario({ currentVolume: 250 });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.ticker).toEqual(ticker);
    expect(result.detected).toBe(true);
  });

  it('should give more weight to recent sessions so an old outlier session does not suppress the signal', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // Day 1 (oldest, weight=1): post-earnings outlier (cumulative 20000).
    // Days 2–10 (weights 2–10): normal sessions (cumulative 1000 each).
    // Unweighted mean baseline = (20000 + 9×1000)/10 = 2900 → would require 4350 → SUPPRESSED.
    // Weighted mean (oldest weight=1, most recent weight=10):
    //   baseline = (20000×1 + 1000×(2+3+4+5+6+7+8+9+10)) / 55 = 74000/55 ≈ 1345
    //   current cumulative = 210 × 10 = 2100 > 1345 ✓
    const bars: PricePoint[] = [];
    bars.push(...buildSessionBars(1, new Array(10).fill(100), 2000));
    for (let day = 2; day <= 10; day++) {
      bars.push(...buildSessionBars(day, new Array(10).fill(100), 100));
    }
    bars.push(
      ...buildSessionBars(
        11,
        [100, 100, 100, 100, 100, 100, 100, 100, 100, 105],
        210,
      ),
    );
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(true);
  });
});
