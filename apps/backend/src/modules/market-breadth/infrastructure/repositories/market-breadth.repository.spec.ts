import { DatabaseService } from '../../../../config/database.service';
import { MarketBreadthRepositoryImpl } from './market-breadth.repository';

function aggregateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    date: '2026-08-31',
    universe_size: 3400,
    new_highs: 120,
    new_lows: 45,
    missing_symbols: [],
    partial: false,
    backfilled: false,
    created_at: '2026-08-31T21:00:00Z',
    updated_at: '2026-08-31T21:00:00Z',
    ...overrides,
  };
}

describe('MarketBreadthRepositoryImpl row mapping', () => {
  let query: jest.Mock;
  let repository: MarketBreadthRepositoryImpl;

  beforeEach(() => {
    query = jest.fn();
    repository = new MarketBreadthRepositoryImpl({
      query,
    } as unknown as DatabaseService);
  });

  it('maps a missing stacked_count column to null', async () => {
    query.mockResolvedValue({ rows: [aggregateRow()] });

    const [aggregate] = await repository.getRecentAggregates(1);

    expect(aggregate.stackedCount).toBeNull();
  });

  it('preserves a zero stacked_count', async () => {
    query.mockResolvedValue({ rows: [aggregateRow({ stacked_count: 0 })] });

    const [aggregate] = await repository.getRecentAggregates(1);

    expect(aggregate.stackedCount).toBe(0);
  });
});
