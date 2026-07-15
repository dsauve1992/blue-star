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
  let dailyBars: PricePoint[];

  beforeEach(async () => {
    // The service makes two market-data calls: 5m intraday bars for the gap
    // signal, and 1d bars for the ADR% band. Route the mock by interval so each
    // test can set the intraday bars via mockResolvedValue and rely on a
    // healthy default set of daily bars (ADR% ~ 4%) unless it overrides them.
    dailyBars = buildDailyBars(24, 4);
    marketDataService = {
      getHistoricalData: jest.fn((_symbol, _range, interval) => {
        if (interval === '1d') {
          return Promise.resolve(historicalData(dailyBars));
        }
        return Promise.resolve(historicalData([]));
      }),
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

  /**
   * Sets the 5m intraday bars the mock returns while keeping the daily-bar
   * routing intact.
   */
  function withIntradayBars(bars: PricePoint[]): void {
    marketDataService.getHistoricalData.mockImplementation(
      (_symbol, _range, interval) => {
        if (interval === '1d') {
          return Promise.resolve(historicalData(dailyBars));
        }
        return Promise.resolve(historicalData(bars));
      },
    );
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

  /**
   * Builds `count` closed daily candles whose per-day range (high-low)/close is
   * exactly `adrPercent`%, so the 20-day ADR% average equals `adrPercent`. Dated
   * in January 2025, before the February sessions under test.
   */
  function buildDailyBars(count: number, adrPercent: number): PricePoint[] {
    const close = 100;
    const halfRange = (adrPercent / 100) * close * 0.5;
    return Array.from({ length: count }, (_, i) =>
      PricePoint.of(
        new Date(Date.UTC(2025, 0, i + 1, 14, 30)),
        close,
        close + halfRange,
        close - halfRange,
        close,
        1_000,
      ),
    );
  }

  interface Ohlc {
    open: number;
    high: number;
    low: number;
    close: number;
  }

  /**
   * Prior session's closing (15:55) candle. Its close + body set the gap
   * reference and its low is the stop. `priorBody = |close - open|`.
   * Defaults: open=close=100 (body 0), low=99 (stop reference).
   */
  const PRIOR_CLOSE_BAR: Ohlc = { open: 100, high: 100, low: 99, close: 100 };

  /**
   * Current session's opening (09:30) candle. The four Pine Script buy
   * conditions are all evaluated here:
   *   gapOk        : open (100.2) >= priorClose (100) + priorBody (0)
   *   greenOk      : close (100.5) > open (100.2)
   *   closedStrong : (100.5 - 100.0) / (100.6 - 100.0) = 0.833 >= 0.66
   *   stopDistOk   : (100.5 - 99) / 100.5 * 100 = 1.49% in [1.1, 1.8]
   * entry = close = 100.5, stop = prior low = 99.
   */
  const OPEN_BAR: Ohlc = { open: 100.2, high: 100.6, low: 100, close: 100.5 };

  /**
   * Builds a two-bar session (09:30 open bar + 15:55 close bar) for `day` of
   * February 2025, at the UTC instants gap detection asserts on (14:30 / 20:55).
   */
  function buildSessionBars(
    day: number,
    open: Ohlc,
    close: Ohlc,
    closingVol = 100,
  ): PricePoint[] {
    const openBar = PricePoint.of(
      new Date(Date.UTC(2025, 1, day, 14, 30)),
      open.open,
      open.high,
      open.low,
      open.close,
      50,
    );
    const closeBar = PricePoint.of(
      new Date(Date.UTC(2025, 1, day, 20, 55)),
      close.open,
      close.high,
      close.low,
      close.close,
      closingVol,
    );
    return [openBar, closeBar];
  }

  /**
   * Prior session (14:30 open bar is irrelevant to the signal; only the 15:55
   * close bar matters) followed by the current session under test.
   */
  function buildScenario(
    priorCloseBar: Ohlc = PRIOR_CLOSE_BAR,
    currentOpenBar: Ohlc = OPEN_BAR,
  ): PricePoint[] {
    const flatPrior: Ohlc = { open: 100, high: 100, low: 100, close: 100 };
    return [
      ...buildSessionBars(11, flatPrior, priorCloseBar),
      ...buildSessionBars(12, currentOpenBar, flatPrior),
    ];
  }

  const NOW_IN_CURRENT_SESSION = new Date('2025-02-12T15:00:00.000Z');

  it('should return detected false when price points are empty', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    withIntradayBars([]);

    const result = await service.detect(ticker);

    expect(result.ticker).toEqual(ticker);
    expect(result.detected).toBe(false);
  });

  it('should fetch intraday market data with a 30-day lookback from the given now', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const now = new Date('2025-02-14T16:00:00.000Z');
    withIntradayBars([]);

    await service.detect(ticker, now);

    expect(marketDataService.getHistoricalData).toHaveBeenNthCalledWith(
      1,
      Symbol.of('AAPL'),
      // 30 days back from Feb 14 = Jan 15, market open at 14:30 UTC (winter)
      DateRange.of(new Date('2025-01-15T14:30:00.000Z'), now),
      '5m',
    );
  });

  it('should return detected false when only one session of data exists', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const bars = buildSessionBars(12, OPEN_BAR, PRIOR_CLOSE_BAR);
    withIntradayBars(bars);

    const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

    expect(result.detected).toBe(false);
  });

  it('should detect when all four buy conditions hold', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    withIntradayBars(buildScenario());

    const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

    expect(result.ticker).toEqual(ticker);
    expect(result.detected).toBe(true);
    // Entry is the 09:30 CLOSE (not the open); stop is the prior 15:55 low.
    expect(result.entryPrice).toBe(100.5);
    expect(result.stopPrice).toBe(99);
  });

  describe('condition 1: body-based gap (open >= priorClose + priorBody)', () => {
    it('detects when open exactly equals priorClose + priorBody (>= is inclusive)', async () => {
      const ticker = WatchlistTicker.of('AAPL');
      // Prior body = |100.4 - 100.4| = 0, priorClose = 100.4 -> threshold = 100.4.
      // Open exactly 100.4 must still qualify (Pine uses >=). Prior low 99.5
      // keeps the stop distance (100.4 close -> 99.5) inside the band.
      const priorCloseBar: Ohlc = {
        open: 100.4,
        high: 100.4,
        low: 99.5,
        close: 100.4,
      };
      const openBar: Ohlc = {
        open: 100.4,
        high: 101.1,
        low: 100.4,
        close: 101,
      };
      withIntradayBars(buildScenario(priorCloseBar, openBar));

      const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

      expect(result.detected).toBe(true);
    });

    it('does not detect when the open fails to clear priorClose + priorBody', async () => {
      const ticker = WatchlistTicker.of('AAPL');
      // Prior body = |101 - 100| = 1, priorClose = 101 -> threshold = 102.
      // Open 101.9 clears the prior close but not the body-based threshold, so a
      // plain close-gap would pass here while the stricter body test does not.
      const priorCloseBar: Ohlc = {
        open: 100,
        high: 101,
        low: 100,
        close: 101,
      };
      const openBar: Ohlc = {
        open: 101.9,
        high: 102.6,
        low: 101.9,
        close: 102.5,
      };
      withIntradayBars(buildScenario(priorCloseBar, openBar));

      const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

      expect(result.detected).toBe(false);
    });
  });

  describe('condition 2: green entry candle (close > open)', () => {
    it('does not detect when the open bar closes at its open (not strictly green)', async () => {
      const ticker = WatchlistTicker.of('AAPL');
      // close == open -> greenOk false (Pine uses strict >).
      const openBar: Ohlc = {
        open: 100.5,
        high: 100.6,
        low: 100,
        close: 100.5,
      };
      withIntradayBars(buildScenario(PRIOR_CLOSE_BAR, openBar));

      const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

      expect(result.detected).toBe(false);
    });

    it('does not detect when the open bar closes red', async () => {
      const ticker = WatchlistTicker.of('AAPL');
      const openBar: Ohlc = {
        open: 100.6,
        high: 100.7,
        low: 100,
        close: 100.5,
      };
      withIntradayBars(buildScenario(PRIOR_CLOSE_BAR, openBar));

      const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

      expect(result.detected).toBe(false);
    });
  });

  describe('condition 3: closed strong (top third of range)', () => {
    it('does not detect when the close sits below the top third of the range', async () => {
      const ticker = WatchlistTicker.of('AAPL');
      // range = 101 - 100 = 1; (close - low)/range = 0.5 < 0.66.
      const openBar: Ohlc = { open: 100.2, high: 101, low: 100, close: 100.5 };
      withIntradayBars(buildScenario(PRIOR_CLOSE_BAR, openBar));

      const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

      expect(result.detected).toBe(false);
    });

    it('detects when the close sits exactly at the 0.66 threshold', async () => {
      const ticker = WatchlistTicker.of('AAPL');
      // range = 100.6 - 100 = 0.6; close-low must be >= 0.66*0.6 = 0.396.
      // close 100.5 -> (0.5/0.6) = 0.833 >= 0.66.
      withIntradayBars(buildScenario());

      const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

      expect(result.detected).toBe(true);
    });
  });

  describe('condition 4: ADR-relative stop-distance band (0.25 - 0.6 x ADR%)', () => {
    // The default daily bars give ADR% = 4%, so the band is 1.0% - 2.4% of entry.
    it('does not detect when the stop is tighter than 0.25 x ADR%', async () => {
      const ticker = WatchlistTicker.of('AAPL');
      // stop = 100 (prior low), entry (close) = 100.5 -> 0.5/100.5 = 0.50%.
      // Band low is 0.25 * 4% = 1.0%, so 0.50% is too tight.
      const priorCloseBar: Ohlc = {
        open: 100,
        high: 100,
        low: 100,
        close: 100,
      };
      const openBar: Ohlc = {
        open: 100.2,
        high: 100.6,
        low: 100.1,
        close: 100.5,
      };
      withIntradayBars(buildScenario(priorCloseBar, openBar));

      const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

      expect(result.detected).toBe(false);
    });

    it('does not detect when the stop is wider than 0.6 x ADR%', async () => {
      const ticker = WatchlistTicker.of('AAPL');
      // stop = 97 (prior low), entry (close) = 100.5 -> 3.5/100.5 = 3.48%.
      // Band high is 0.6 * 4% = 2.4%, so 3.48% is too wide.
      const priorCloseBar: Ohlc = { open: 100, high: 100, low: 97, close: 100 };
      withIntradayBars(buildScenario(priorCloseBar, OPEN_BAR));

      const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

      expect(result.detected).toBe(false);
    });

    it('does not detect when the stop is above entry (risk <= 0)', async () => {
      const ticker = WatchlistTicker.of('AAPL');
      // Prior low 101 sits above the 100.5 entry close -> risk negative.
      const priorCloseBar: Ohlc = {
        open: 101,
        high: 101,
        low: 101,
        close: 101,
      };
      const openBar: Ohlc = {
        open: 101,
        high: 101.4,
        low: 100.9,
        close: 101.3,
      };
      withIntradayBars(buildScenario(priorCloseBar, openBar));

      const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

      expect(result.detected).toBe(false);
    });

    it('band widens with volatility: a 1.49% stop passes at ADR% 4% but fails at ADR% 2%', async () => {
      const ticker = WatchlistTicker.of('AAPL');
      // OPEN_BAR stop distance = (100.5 - 99)/100.5 = 1.49%.
      withIntradayBars(buildScenario());

      // ADR% 4% -> band 1.0% - 2.4% -> 1.49% passes.
      dailyBars = buildDailyBars(24, 4);
      const wide = await service.detect(ticker, NOW_IN_CURRENT_SESSION);
      expect(wide.detected).toBe(true);

      // ADR% 2% -> band 0.5% - 1.2% -> 1.49% is now too wide.
      dailyBars = buildDailyBars(24, 2);
      const tight = await service.detect(ticker, NOW_IN_CURRENT_SESSION);
      expect(tight.detected).toBe(false);
    });

    it('does not detect when fewer than 20 closed daily sessions exist for ADR%', async () => {
      const ticker = WatchlistTicker.of('AAPL');
      withIntradayBars(buildScenario());
      // Only 19 closed daily bars — ADR% is not computable.
      dailyBars = buildDailyBars(19, 4);

      const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

      expect(result.detected).toBe(false);
    });
  });

  it('enriches the result with gap context on a positive detection', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    withIntradayBars(buildScenario());
    gapContextService.enrich.mockResolvedValue(
      GapContext.of({
        industryGroup: 'Software & Services',
        globalRsRating: 95,
        industryGroupRsRating: 80,
        industryGroupQuadrant: 'Leading',
      }),
    );

    const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

    expect(gapContextService.enrich).toHaveBeenCalledWith(ticker);
    expect(result.context?.industryGroup).toBe('Software & Services');
    expect(result.context?.globalRsRating).toBe(95);
    expect(result.context?.industryGroupRsRating).toBe(80);
    expect(result.context?.industryGroupQuadrant).toBe('Leading');
  });

  it('does not enrich context when no gap is detected', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // Red open bar -> no signal.
    const openBar: Ohlc = { open: 100.6, high: 100.7, low: 100, close: 100.5 };
    withIntradayBars(buildScenario(PRIOR_CLOSE_BAR, openBar));

    const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

    expect(result.detected).toBe(false);
    expect(result.context).toBeUndefined();
    expect(gapContextService.enrich).not.toHaveBeenCalled();
  });

  it("surfaces the prior session's 15:55 close-bar low as the stop price", async () => {
    const ticker = WatchlistTicker.of('AAPL');
    // Prior close bar low of 99 is the stop; entry is the 09:30 close (100.5).
    withIntradayBars(buildScenario());

    const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

    expect(result.detected).toBe(true);
    expect(result.stopPrice).toBe(99);
  });

  it('should return detected false when the current session is not today', async () => {
    const ticker = WatchlistTicker.of('AAPL');
    withIntradayBars(buildScenario());

    // Current session is Feb 12, but now is Feb 13 — last session is stale.
    const result = await service.detect(
      ticker,
      new Date('2025-02-13T15:00:00.000Z'),
    );

    expect(result.detected).toBe(false);
  });

  it("should return detected false when the current session's first bar is not the 9:30 open", async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const bars = buildScenario();
    // Drop the current session's 9:30 open bar; the 3:55 close bar then leads.
    const currentOpen = new Date('2025-02-12T14:30:00.000Z').getTime();
    const withoutOpen = bars.filter(
      (bar) => bar.date.getTime() !== currentOpen,
    );
    withIntradayBars(withoutOpen);

    const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

    expect(result.detected).toBe(false);
  });

  it("should return detected false when the prior session's last bar is not the 3:55 close", async () => {
    const ticker = WatchlistTicker.of('AAPL');
    const bars = buildScenario();
    // Drop the prior session's 3:55 close bar; its 9:30 open bar then trails.
    const priorClose = new Date('2025-02-11T20:55:00.000Z').getTime();
    const withoutPriorClose = bars.filter(
      (bar) => bar.date.getTime() !== priorClose,
    );
    withIntradayBars(withoutPriorClose);

    const result = await service.detect(ticker, NOW_IN_CURRENT_SESSION);

    expect(result.detected).toBe(false);
  });
});
