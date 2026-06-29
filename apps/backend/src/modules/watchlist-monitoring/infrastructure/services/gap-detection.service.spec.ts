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
import { GAP_CONTEXT_SERVICE } from '../../constants/tokens';
import type { GapContextService } from '../../domain/services/gap-context.service';
import { GapContext } from '../../domain/value-objects/gap-context';

describe('GapDetectionServiceImpl', () => {
  let service: GapDetectionServiceImpl;
  let marketDataService: jest.Mocked<MarketDataService>;
  let gapContextService: jest.Mocked<GapContextService>;

  beforeEach(async () => {
    marketDataService = {
      getHistoricalData: jest.fn(),
    };
    gapContextService = {
      enrich: jest.fn().mockResolvedValue(GapContext.none()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GapDetectionServiceImpl,
        {
          provide: MARKET_DATA_SERVICE,
          useValue: marketDataService,
        },
        {
          provide: GAP_CONTEXT_SERVICE,
          useValue: gapContextService,
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
   * Builds a session whose first bar opens at 14:30 UTC (9:30 AM ET) and whose
   * closing bar opens at 20:55 UTC (3:55 PM ET) — the real session boundaries
   * gap detection asserts on. `day` is the day-of-month within February 2025.
   */
  function buildSessionBars(
    day: number,
    options: {
      closingVol?: number;
      closingHigh?: number;
      firstOpen?: number;
    } = {},
  ): PricePoint[] {
    const { closingVol = 100, closingHigh = 100, firstOpen = 100 } = options;

    const openBar = PricePoint.of(
      new Date(Date.UTC(2025, 1, day, 14, 30)),
      firstOpen,
      firstOpen,
      firstOpen,
      firstOpen,
      50,
    );
    const closeBar = PricePoint.of(
      new Date(Date.UTC(2025, 1, day, 20, 55)),
      100,
      Math.max(100, closingHigh),
      100,
      100,
      closingVol,
    );
    return [openBar, closeBar];
  }

  /**
   * Builds the standard gap scenario:
   * - N prior sessions as volume baseline (5 bars each, closing candle has `priorClosingVol`)
   * - 1 "day D" session: closing candle has `dayDClosingVol` and `dayDHigh`
   * - 1 "day D+1" session: first bar opens at `dayD1FirstOpen`
   *
   * Signal = vol_ok on D AND gap_ok on D+1
   * vol_ok: dayDClosingVol >= 2.0 * avg(priorClosingVols)
   * gap_ok: dayD1FirstOpen > dayDHigh AND dayD1FirstBar.low > dayDHigh
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
      { includePrePost: false },
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

    // Day D+1 (current session) is day 12 of Feb 2025; now must fall in it.
    const result = await service.detect(
      ticker,
      new Date('2025-02-12T15:00:00.000Z'),
    );

    expect(result.ticker).toEqual(ticker);
    expect(result.detected).toBe(true);
    expect(result.entryPrice).toBe(108);
    expect(result.stopPrice).toBe(100);
  });

  it('enriches the result with gap context on a positive detection', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const bars = buildGapScenario({
      priorClosingVol: 100,
      dayDClosingVol: 200,
      dayDHigh: 105,
      dayD1FirstOpen: 108,
    });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));
    gapContextService.enrich.mockResolvedValue(
      GapContext.of({
        industryGroup: 'Software & Services',
        globalRsRating: 95,
        industryGroupRsRating: 80,
        industryGroupQuadrant: 'Leading',
      }),
    );

    const result = await service.detect(
      ticker,
      new Date('2025-02-12T15:00:00.000Z'),
    );

    expect(gapContextService.enrich).toHaveBeenCalledWith(ticker);
    expect(result.context?.industryGroup).toBe('Software & Services');
    expect(result.context?.globalRsRating).toBe(95);
    expect(result.context?.industryGroupRsRating).toBe(80);
    expect(result.context?.industryGroupQuadrant).toBe('Leading');
  });

  it('does not enrich context when no gap is detected', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const bars = buildGapScenario({ dayDHigh: 105, dayD1FirstOpen: 105 });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(
      ticker,
      new Date('2025-02-12T15:00:00.000Z'),
    );

    expect(result.detected).toBe(false);
    expect(result.context).toBeUndefined();
    expect(gapContextService.enrich).not.toHaveBeenCalled();
  });

  it("surfaces the prior session's 15:55 close-bar low as the stop price", async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // Day D's first bar dips to a low of 92, but the 15:55 close bar's low is 95;
    // the stop should track the close-bar low, not the session-wide low.
    const bars: PricePoint[] = [];
    for (let day = 1; day <= 10; day++) {
      bars.push(...buildSessionBars(day, { closingVol: 100 }));
    }
    const dayDBars = buildSessionBars(11, {
      closingVol: 200,
      closingHigh: 105,
    });
    dayDBars[0] = PricePoint.of(dayDBars[0].date, 92, 100, 92, 100, 50);
    dayDBars[1] = PricePoint.of(dayDBars[1].date, 100, 105, 95, 100, 200);
    bars.push(...dayDBars);
    bars.push(...buildSessionBars(12, { firstOpen: 108 }));
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    const result = await service.detect(
      ticker,
      new Date('2025-02-12T15:00:00.000Z'),
    );

    expect(result.detected).toBe(true);
    expect(result.stopPrice).toBe(95);
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

  it('should return detected false when the open gaps up but the first bar dips back into the prior range', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // vol_ok=true, open=108 > dayDHigh=105, but the first bar's low=104 <= 105 →
    // the opening candle overlaps the prior session's range, so gap_ok=false.
    const bars = buildGapScenario({
      dayDClosingVol: 200,
      dayDHigh: 105,
      dayD1FirstOpen: 108,
    });
    const currentOpenTime = new Date('2025-02-12T14:30:00.000Z').getTime();
    const overlappingBars = bars.map((bar) =>
      bar.date.getTime() === currentOpenTime
        ? PricePoint.of(bar.date, 108, 108, 104, 108, 50)
        : bar,
    );
    marketDataService.getHistoricalData.mockResolvedValue(
      historicalData(overlappingBars),
    );

    const result = await service.detect(
      ticker,
      new Date('2025-02-12T15:00:00.000Z'),
    );

    expect(result.detected).toBe(false);
  });

  it('should return detected false when the current session is not today', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const bars = buildGapScenario({
      dayDClosingVol: 200,
      dayDHigh: 105,
      dayD1FirstOpen: 108,
    });
    marketDataService.getHistoricalData.mockResolvedValue(historicalData(bars));

    // Current session is Feb 12, but now is Feb 13 — last session is stale.
    const result = await service.detect(
      ticker,
      new Date('2025-02-13T15:00:00.000Z'),
    );

    expect(result.detected).toBe(false);
  });

  it("should return detected false when the current session's first bar is not the 9:30 open", async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const bars = buildGapScenario({
      dayDClosingVol: 200,
      dayDHigh: 105,
      dayD1FirstOpen: 108,
    });
    // Drop the current session's 9:30 open bar; the 3:55 close bar then leads.
    const currentOpen = new Date('2025-02-12T14:30:00.000Z').getTime();
    const withoutOpen = bars.filter(
      (bar) => bar.date.getTime() !== currentOpen,
    );
    marketDataService.getHistoricalData.mockResolvedValue(
      historicalData(withoutOpen),
    );

    const result = await service.detect(
      ticker,
      new Date('2025-02-12T15:00:00.000Z'),
    );

    expect(result.detected).toBe(false);
  });

  it("should return detected false when the prior session's last bar is not the 3:55 close", async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const bars = buildGapScenario({
      dayDClosingVol: 200,
      dayDHigh: 105,
      dayD1FirstOpen: 108,
    });
    // Drop the prior session's 3:55 close bar; its 9:30 open bar then trails.
    const priorClose = new Date('2025-02-11T20:55:00.000Z').getTime();
    const withoutPriorClose = bars.filter(
      (bar) => bar.date.getTime() !== priorClose,
    );
    marketDataService.getHistoricalData.mockResolvedValue(
      historicalData(withoutPriorClose),
    );

    const result = await service.detect(
      ticker,
      new Date('2025-02-12T15:00:00.000Z'),
    );

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

    const result = await service.detect(
      ticker,
      new Date('2025-02-27T15:00:00.000Z'),
    );

    expect(result.detected).toBe(true);
  });
});
