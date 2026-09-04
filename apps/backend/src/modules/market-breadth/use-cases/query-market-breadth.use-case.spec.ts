import { QueryMarketBreadthUseCase } from './query-market-breadth.use-case';
import { MarketBreadthRepository } from '../domain/repositories/market-breadth.repository.interface';
import { MarketBreadthAggregate } from '../domain/entities/market-breadth-aggregate';
import { BreadthDate } from '../domain/value-objects/breadth-date';

const UNIVERSE_SIZE = 3400;

function makeAggregate(
  date: string,
  newHighs: number,
  newLows: number,
  stackedCount: number | null = null,
) {
  return MarketBreadthAggregate.create({
    date: BreadthDate.fromISOString(date),
    universeSize: UNIVERSE_SIZE,
    newHighs,
    newLows,
    stackedCount,
    missingSymbols: [],
    partial: false,
    backfilled: false,
  });
}

function sessionDate(daysBeforeNewest: number): string {
  const date = new Date(Date.UTC(2026, 8, 3));
  date.setUTCDate(date.getUTCDate() - daysBeforeNewest);
  return date.toISOString().slice(0, 10);
}

function newestFirst(stackedCounts: Array<number | null>) {
  return stackedCounts.map((stackedCount, index) =>
    makeAggregate(sessionDate(index), 10, 10, stackedCount),
  );
}

describe('QueryMarketBreadthUseCase', () => {
  let repository: jest.Mocked<MarketBreadthRepository>;
  let useCase: QueryMarketBreadthUseCase;

  beforeEach(() => {
    repository = {
      saveMembership: jest.fn(),
      getMembership: jest.fn(),
      saveAggregate: jest.fn(),
      getRecentAggregates: jest.fn(),
    };
    useCase = new QueryMarketBreadthUseCase(repository);
  });

  it('returns sessions oldest-to-newest with the derived ratio', async () => {
    repository.getRecentAggregates.mockResolvedValue([
      makeAggregate('2026-08-31', 120, 40),
      makeAggregate('2026-08-28', 100, 50),
    ]);

    const response = await useCase.execute();

    expect(response.sessions.map((s) => s.date)).toEqual([
      '2026-08-28',
      '2026-08-31',
    ]);
    expect(response.sessions[1].ratio).toBeCloseTo(120 / 160, 5);
  });

  it('fetches 19 warm-up sessions beyond the default of 50', async () => {
    repository.getRecentAggregates.mockResolvedValue([]);

    await useCase.execute();

    expect(repository.getRecentAggregates).toHaveBeenCalledWith(69);
  });

  it('fetches 19 warm-up sessions beyond an explicit limit', async () => {
    repository.getRecentAggregates.mockResolvedValue([]);

    await useCase.execute(10);

    expect(repository.getRecentAggregates).toHaveBeenCalledWith(29);
  });

  it('returns only the requested number of newest sessions', async () => {
    repository.getRecentAggregates.mockResolvedValue(
      newestFirst(Array<number>(29).fill(340)),
    );

    const response = await useCase.execute(10);

    expect(response.sessions).toHaveLength(10);
    expect(response.sessions.at(-1)?.date).toBe(sessionDate(0));
    expect(response.sessions[0].date).toBe(sessionDate(9));
  });

  it('seeds the averages with warm-up sessions before the returned window', async () => {
    const warmupCounts = Array<number>(19).fill(0);
    const displayedCounts = Array<number>(10).fill(UNIVERSE_SIZE);
    repository.getRecentAggregates.mockResolvedValue(
      newestFirst([...displayedCounts, ...warmupCounts]),
    );

    const response = await useCase.execute(10);

    expect(response.sessions[0].stackedRatio).toBeCloseTo(1, 5);
    expect(response.sessions[0].stackedRatioEma10).toBeCloseTo(2 / 11, 5);
    expect(response.sessions[0].stackedRatioEma20).toBeCloseTo(2 / 21, 5);
    expect(response.sessions[0].trendState).toBe('GOOD');
  });

  it('exposes the stacked count, ratio, both averages and the state per session', async () => {
    repository.getRecentAggregates.mockResolvedValue(newestFirst([1700, 850]));

    const response = await useCase.execute();

    expect(response.sessions[0]).toMatchObject({
      stackedCount: 850,
      stackedRatio: 0.25,
      stackedRatioEma10: 0.25,
      stackedRatioEma20: 0.25,
      trendState: null,
    });
    expect(response.sessions[1]).toMatchObject({
      stackedCount: 1700,
      stackedRatio: 0.5,
      trendState: 'GOOD',
    });
    expect(response.sessions[1].stackedRatioEma10).toBeCloseTo(
      0.25 + 0.25 * (2 / 11),
      5,
    );
    expect(response.sessions[1].stackedRatioEma20).toBeCloseTo(
      0.25 + 0.25 * (2 / 21),
      5,
    );
  });

  it('reports the latest session as the headline trend', async () => {
    repository.getRecentAggregates.mockResolvedValue(
      newestFirst([340, 1700, 1700, 1700, 1700, 1700, 1700]),
    );

    const response = await useCase.execute();

    const latest = response.sessions.at(-1)!;
    expect(latest.trendState).toBe('BAD');
    expect(response.trend).toEqual({
      state: latest.trendState,
      ema10: latest.stackedRatioEma10,
      ema20: latest.stackedRatioEma20,
      sampleSize: 7,
    });
  });

  it('passes null stacked counts through as null ratio and state', async () => {
    repository.getRecentAggregates.mockResolvedValue(newestFirst([null, null]));

    const response = await useCase.execute();

    expect(response.sessions.map((s) => s.stackedCount)).toEqual([null, null]);
    expect(response.sessions.map((s) => s.stackedRatio)).toEqual([null, null]);
    expect(response.sessions.map((s) => s.stackedRatioEma10)).toEqual([
      null,
      null,
    ]);
    expect(response.sessions.map((s) => s.trendState)).toEqual([null, null]);
    expect(response.trend).toBeNull();
  });

  it('smooths the NH/NL ratio with a fast and a slow average and classifies the crossover', async () => {
    repository.getRecentAggregates.mockResolvedValue([
      makeAggregate('2026-09-03', 69, 22),
      makeAggregate('2026-09-02', 62, 29),
      makeAggregate('2026-09-01', 36, 60),
      makeAggregate('2026-08-31', 20, 42),
      makeAggregate('2026-08-28', 48, 15),
      makeAggregate('2026-08-27', 0, 100),
    ]);

    const response = await useCase.execute();

    expect(response.sessions.map((s) => s.ratioEma10?.toFixed(2))).toEqual([
      '0.00',
      '0.14',
      '0.17',
      '0.21',
      '0.29',
      '0.38',
    ]);
    expect(response.sessions.map((s) => s.ratioEma20?.toFixed(2))).toEqual([
      '0.00',
      '0.07',
      '0.10',
      '0.12',
      '0.18',
      '0.23',
    ]);
    expect(response.sessions.map((s) => s.ratioState)).toEqual([
      null,
      'GOOD',
      'GOOD',
      'GOOD',
      'GOOD',
      'GOOD',
    ]);
    const latest = response.sessions.at(-1)!;
    expect(response.newHighLow).toEqual({
      state: 'GOOD',
      ema10: latest.ratioEma10,
      ema20: latest.ratioEma20,
      sampleSize: 6,
    });
  });

  it('is BAD for NH/NL when the fast average drops below the slow average', async () => {
    repository.getRecentAggregates.mockResolvedValue([
      makeAggregate(sessionDate(0), 10, 90),
      ...Array.from({ length: 6 }, (_, index) =>
        makeAggregate(sessionDate(index + 1), 80, 20),
      ),
    ]);

    const response = await useCase.execute();

    expect(response.sessions.at(-1)?.ratioState).toBe('BAD');
    expect(response.newHighLow?.state).toBe('BAD');
  });

  it('warms up the NH/NL averages with sessions before the returned window', async () => {
    repository.getRecentAggregates.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) =>
        makeAggregate(sessionDate(index), index === 0 ? 100 : 0, 100),
      ),
    );

    const response = await useCase.execute(2);

    expect(response.sessions[0].ratioEma10).toBe(0);
    expect(response.sessions[0].ratioEma20).toBe(0);
    expect(response.sessions[1].ratioEma10).toBeCloseTo(1 / 11, 5);
    expect(response.sessions[1].ratioEma20).toBeCloseTo(1 / 21, 5);
    expect(response.sessions[1].ratioState).toBe('GOOD');
  });

  it('returns null gauges when there are no sessions', async () => {
    repository.getRecentAggregates.mockResolvedValue([]);

    const response = await useCase.execute();

    expect(response.newHighLow).toBeNull();
    expect(response.trend).toBeNull();
  });

  it('returns a null ratio when both counts are zero', async () => {
    repository.getRecentAggregates.mockResolvedValue([
      makeAggregate('2026-08-31', 0, 0),
    ]);

    const response = await useCase.execute();

    expect(response.sessions[0].ratio).toBeNull();
  });
});
