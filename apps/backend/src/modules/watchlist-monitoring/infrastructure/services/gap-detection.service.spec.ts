import { Test, TestingModule } from '@nestjs/testing';
import { GapDetectionServiceImpl } from './gap-detection.service';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';
import type {
  HistoricalData,
  MarketDataService,
} from '../../../market-data/domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../../market-data/constants/tokens';

describe('GapDetectionServiceImpl', () => {
  let service: GapDetectionServiceImpl;
  let marketDataService: jest.Mocked<MarketDataService>;

  beforeEach(async () => {
    marketDataService = {
      getHistoricalData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GapDetectionServiceImpl,
        {
          provide: MARKET_DATA_SERVICE,
          useValue: marketDataService,
        },
      ],
    }).compile();

    service = module.get(GapDetectionServiceImpl);
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
   * Builds a session of 5-min bars starting at 14:30 UTC (9:30 AM ET).
   * day is the day-of-month within February 2025.
   */
  function buildSessionBars(
    day: number,
    options: {
      closingVol?: number;
      closingHigh?: number;
      firstOpen?: number;
      barCount?: number;
    } = {},
  ): PricePoint[] {
    const {
      closingVol = 100,
      closingHigh = 100,
      firstOpen = 100,
      barCount = 5,
    } = options;

    const sessionStart = new Date(Date.UTC(2025, 1, day, 14, 30));
    return Array.from({ length: barCount }, (_, i) => {
      const barDate = new Date(sessionStart.getTime() + i * 5 * 60 * 1000);
      const isFirst = i === 0;
      const isLast = i === barCount - 1;
      const open = isFirst ? firstOpen : 100;
      const close = 100;
      const high = Math.max(open, close, isLast ? closingHigh : 0);
      const low = Math.min(open, close);
      const volume = isLast ? closingVol : 50;
      return PricePoint.of(barDate, open, high, low, close, volume);
    });
  }

  /**
   * Builds the standard gap scenario:
   * - N prior sessions as volume baseline (5 bars each, closing candle has `priorClosingVol`)
   * - 1 "day D" session: closing candle has `dayDClosingVol` and `dayDHigh`
   * - 1 "day D+1" session: first bar opens at `dayD1FirstOpen`
   *
   * Signal = vol_ok on D AND gap_ok on D+1
   * vol_ok: dayDClosingVol >= 2.0 * avg(priorClosingVols)
   * gap_ok: dayD1FirstOpen > dayDHigh
   */
  function buildGapScenario(options: {
    priorSessionCount?: number;
    priorClosingVol?: number;
    dayDClosingVol?: number;
    dayDHigh?: number;
    dayD1FirstOpen?: number;
  }): PricePoint[] {
    const {
      priorSessionCount = 10,
      priorClosingVol = 100,
      dayDClosingVol = 250,
      dayDHigh = 105,
      dayD1FirstOpen = 108,
    } = options;

    const bars: PricePoint[] = [];

    // Prior sessions (days 1..N) — closing candle volume feeds the avg_last_vol baseline
    for (let day = 1; day <= priorSessionCount; day++) {
      bars.push(...buildSessionBars(day, { closingVol: priorClosingVol }));
    }

    // Day D: closing vol must satisfy vol_ok, closing high sets the gap reference
    const dayD = priorSessionCount + 1;
    bars.push(
      ...buildSessionBars(dayD, {
        closingVol: dayDClosingVol,
        closingHigh: dayDHigh,
      }),
    );

    // Day D+1: first bar open must be > dayDHigh
    const dayD1 = dayD + 1;
    bars.push(...buildSessionBars(dayD1, { firstOpen: dayD1FirstOpen }));

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

  it('should return detected false when only one session of data exists (no prior session for gap comparison)', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const bars = buildSessionBars(14, { firstOpen: 110 });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should return detected false when gap_ok fails (today open <= yesterday last high)', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // dayDHigh=105, dayD1FirstOpen=105 → not strictly greater → gap_ok=false
    const bars = buildGapScenario({ dayDHigh: 105, dayD1FirstOpen: 105 });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should return detected false when vol_ok fails (yesterday closing vol below 2x average)', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // avg_last_vol = 100, dayDClosingVol = 199 < 2.0 * 100 → vol_ok=false
    const bars = buildGapScenario({
      priorClosingVol: 100,
      dayDClosingVol: 199,
    });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should return detected false when fewer than VOL_MIN_PERIODS prior sessions exist for baseline', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // Only 3 prior sessions before day D, below the VOL_MIN_PERIODS=5 threshold
    const bars = buildGapScenario({ priorSessionCount: 3 });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should return detected true when vol_ok on day D and gap_ok on day D+1', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // priorClosingVol=100 → avg_last_vol=100; dayDClosingVol=200 >= 2.0*100 ✓
    // dayDHigh=105, dayD1FirstOpen=108 > 105 ✓
    const bars = buildGapScenario({
      priorClosingVol: 100,
      dayDClosingVol: 200,
      dayDHigh: 105,
      dayD1FirstOpen: 108,
    });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.ticker).toEqual(ticker);
    expect(result.detected).toBe(true);
    expect(result.entryPrice).toBe(108);
    expect(result.stopPrice).toBe(100);
  });

  it('surfaces the prior-session low as the stop price', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // Day D's first bar dips to a low of 92 (open 92, closes back at 100);
    // the stop should track that session low, not the gap reference high.
    const bars: PricePoint[] = [];
    for (let day = 1; day <= 10; day++) {
      bars.push(...buildSessionBars(day, { closingVol: 100 }));
    }
    const dayDBars = buildSessionBars(11, {
      closingVol: 200,
      closingHigh: 105,
    });
    dayDBars[0] = PricePoint.of(dayDBars[0].date, 92, 100, 92, 100, 50);
    bars.push(...dayDBars);
    bars.push(...buildSessionBars(12, { firstOpen: 108 }));
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(true);
    expect(result.stopPrice).toBe(92);
  });

  it('should return detected false when vol_ok on day D but no gap on day D+1', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // vol_ok=true but dayD1FirstOpen=104 < dayDHigh=105 → gap_ok=false
    const bars = buildGapScenario({
      dayDClosingVol: 200,
      dayDHigh: 105,
      dayD1FirstOpen: 104,
    });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should return detected false when gap exists but vol_ok on day D fails', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // gap_ok=true but dayDClosingVol=100 = 1.0 * avg(100) < 2.0 → vol_ok=false
    const bars = buildGapScenario({
      priorClosingVol: 100,
      dayDClosingVol: 100,
      dayDHigh: 105,
      dayD1FirstOpen: 108,
    });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(false);
  });

  it('should use exactly the last VOL_LOOKBACK_SESSIONS prior sessions for the volume average', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // 25 prior sessions before day D: first 5 have massive volume (10000), last 20 have volume 100
    // With VOL_LOOKBACK=20: avg = (20 * 100) / 20 = 100; dayDClosingVol=200 >= 200 ✓
    // Without the cap (all 25): avg would be (5*10000 + 20*100) / 25 = 2080; 200 < 4160 ✗
    const bars: PricePoint[] = [];
    for (let day = 1; day <= 5; day++) {
      bars.push(...buildSessionBars(day, { closingVol: 10000 }));
    }
    for (let day = 6; day <= 25; day++) {
      bars.push(...buildSessionBars(day, { closingVol: 100 }));
    }
    // Day D
    bars.push(...buildSessionBars(26, { closingVol: 200, closingHigh: 105 }));
    // Day D+1
    bars.push(...buildSessionBars(27, { firstOpen: 108 }));
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(ticker);

    expect(result.detected).toBe(true);
  });
});
