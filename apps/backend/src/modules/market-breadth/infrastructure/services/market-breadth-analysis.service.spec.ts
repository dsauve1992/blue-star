import { MarketBreadthAnalysisServiceImpl } from './market-breadth-analysis.service';
import { MarketBreadthUniverseService } from '../../domain/services/market-breadth-universe.service';
import { MarketBreadthRepository } from '../../domain/repositories/market-breadth.repository.interface';
import type { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';
import { REQUIRED_TRAILING_SESSIONS } from '../../domain/services/nh-nl-computation.service';

const FAKE_DATE_RANGE = DateRange.of(
  new Date(2020, 0, 1),
  new Date(2020, 0, 2),
);

function buildDailyPricePoints(
  sessions: number,
  overrides: Record<number, { high?: number; low?: number }> = {},
): PricePoint[] {
  const points: PricePoint[] = [];
  const start = new Date(2020, 0, 1);
  for (let i = 0; i < sessions; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const override = overrides[i] ?? {};
    points.push(
      PricePoint.of(
        date,
        100,
        override.high ?? 100,
        override.low ?? 90,
        95,
        1_000_000,
      ),
    );
  }
  return points;
}

describe('MarketBreadthAnalysisServiceImpl', () => {
  let universeService: jest.Mocked<MarketBreadthUniverseService>;
  let marketDataService: jest.Mocked<MarketDataService>;
  let repository: jest.Mocked<MarketBreadthRepository>;
  let service: MarketBreadthAnalysisServiceImpl;

  const sessionCount = REQUIRED_TRAILING_SESSIONS + 5;
  const candles = buildDailyPricePoints(sessionCount, {
    [sessionCount - 1]: { high: 500, low: 1 },
  });

  beforeEach(() => {
    universeService = {
      fetchUniverse: jest.fn().mockResolvedValue({
        scan_date: '2026-08-31',
        universe_size: 2,
        symbols: ['AAPL', 'MSFT'],
      }),
    };

    const getHistoricalData: jest.MockedFunction<
      MarketDataService['getHistoricalData']
    > = jest.fn();
    getHistoricalData.mockImplementation((symbol) =>
      Promise.resolve({
        symbol,
        dateRange: FAKE_DATE_RANGE,
        pricePoints: candles,
      }),
    );
    marketDataService = { getHistoricalData };

    repository = {
      saveMembership: jest.fn().mockResolvedValue(undefined),
      getMembership: jest.fn(),
      saveAggregate: jest.fn().mockResolvedValue(undefined),
      getRecentAggregates: jest.fn(),
    };

    service = new MarketBreadthAnalysisServiceImpl(
      universeService,
      marketDataService,
      repository,
    );
  });

  it('persists membership for the fetched universe', async () => {
    await service.runDaily();

    expect(repository.saveMembership).toHaveBeenCalledTimes(1);
    const [date, symbols] = repository.saveMembership.mock.calls[0];
    expect(date.toISOString()).toBe('2026-08-31');
    expect(symbols).toEqual(['AAPL', 'MSFT']);
  });

  it('recomputes exactly 5 sessions and saves one aggregate per session', async () => {
    const result = await service.runDaily();

    expect(result.sessionsRecomputed).toHaveLength(5);
    expect(repository.saveAggregate).toHaveBeenCalledTimes(5);
  });

  it('flags a new high and new low on the most recent session', async () => {
    await service.runDaily();

    const savedAggregates = repository.saveAggregate.mock.calls.map(
      (call) => call[0],
    );
    const latest = savedAggregates[savedAggregates.length - 1];

    expect(latest.newHighs).toBe(2);
    expect(latest.newLows).toBe(2);
    expect(latest.universeSize).toBe(2);
    expect(latest.backfilled).toBe(false);
  });

  it('marks missing symbols and flags the run partial above the 5% threshold', async () => {
    universeService.fetchUniverse.mockResolvedValue({
      scan_date: '2026-08-31',
      universe_size: 20,
      symbols: Array.from({ length: 20 }, (_, i) => `SYM${i}`),
    });

    marketDataService.getHistoricalData.mockImplementation((symbol) => {
      if (symbol.value.startsWith('SYM') && Number(symbol.value.slice(3)) < 2) {
        return Promise.reject(new Error('Yahoo fetch failed'));
      }
      return Promise.resolve({
        symbol,
        dateRange: FAKE_DATE_RANGE,
        pricePoints: candles,
      });
    });

    const result = await service.runDaily();

    const latest = result.aggregates[result.aggregates.length - 1];
    expect(latest.partial).toBe(true);
    expect(latest.missingSymbols.sort()).toEqual(['SYM0', 'SYM1']);
  });

  it('is idempotent: recomputing the same sessions upserts rather than duplicates', async () => {
    await service.runDaily();
    await service.runDaily();

    expect(repository.saveAggregate).toHaveBeenCalledTimes(10);
    const firstRunLatest = repository.saveAggregate.mock.calls[4][0];
    const secondRunLatest = repository.saveAggregate.mock.calls[9][0];
    expect(secondRunLatest.newHighs).toBe(firstRunLatest.newHighs);
    expect(secondRunLatest.date.toISOString()).toBe(
      firstRunLatest.date.toISOString(),
    );
  });

  it('still persists membership when every symbol fails to fetch candles', async () => {
    marketDataService.getHistoricalData.mockRejectedValue(
      new Error('Yahoo is down'),
    );

    await expect(service.runDaily()).rejects.toThrow(
      'Unable to determine trading sessions',
    );

    expect(repository.saveMembership).toHaveBeenCalledTimes(1);
    expect(repository.saveAggregate).not.toHaveBeenCalled();
  });

  describe('runBackfill', () => {
    it('does not persist membership', async () => {
      await service.runBackfill(5);

      expect(repository.saveMembership).not.toHaveBeenCalled();
    });

    it('uses a longer candle lookback window than the daily run', async () => {
      await service.runDaily();
      const dailyRange = marketDataService.getHistoricalData.mock.calls[0][1];

      marketDataService.getHistoricalData.mockClear();

      await service.runBackfill(5);
      const backfillRange =
        marketDataService.getHistoricalData.mock.calls[0][1];

      const dailyDays = dailyRange.getDaysDifference();
      const backfillDays = backfillRange.getDaysDifference();
      expect(backfillDays).toBeGreaterThan(dailyDays);
      expect(backfillDays).toBeGreaterThanOrEqual(
        REQUIRED_TRAILING_SESSIONS + 60,
      );
    });

    it('recomputes the requested number of sessions and flags them backfilled', async () => {
      const result = await service.runBackfill(5);

      expect(result.sessionsRecomputed).toHaveLength(5);
      expect(repository.saveAggregate).toHaveBeenCalledTimes(5);
      const savedAggregates = repository.saveAggregate.mock.calls.map(
        (call) => call[0],
      );
      expect(savedAggregates.every((a) => a.backfilled)).toBe(true);
    });
  });
});
