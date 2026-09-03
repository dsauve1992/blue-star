import { QueryMarketBreadthUseCase } from './query-market-breadth.use-case';
import { MarketBreadthRepository } from '../domain/repositories/market-breadth.repository.interface';
import { MarketBreadthAggregate } from '../domain/entities/market-breadth-aggregate';
import { BreadthDate } from '../domain/value-objects/breadth-date';

function makeAggregate(date: string, newHighs: number, newLows: number) {
  return MarketBreadthAggregate.create({
    date: BreadthDate.fromISOString(date),
    universeSize: 3400,
    newHighs,
    newLows,
    missingSymbols: [],
    partial: false,
    backfilled: false,
  });
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

  it('defaults to 50 sessions when no limit is given', async () => {
    repository.getRecentAggregates.mockResolvedValue([]);

    await useCase.execute();

    expect(repository.getRecentAggregates).toHaveBeenCalledWith(50);
  });

  it('passes through an explicit limit', async () => {
    repository.getRecentAggregates.mockResolvedValue([]);

    await useCase.execute(10);

    expect(repository.getRecentAggregates).toHaveBeenCalledWith(10);
  });

  it('returns a null ratio when both counts are zero', async () => {
    repository.getRecentAggregates.mockResolvedValue([
      makeAggregate('2026-08-31', 0, 0),
    ]);

    const response = await useCase.execute();

    expect(response.sessions[0].ratio).toBeNull();
  });
});
