import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { MarketBreadthRepository } from '../../../domain/repositories/market-breadth.repository.interface';
import { MarketBreadthRepositoryImpl } from '../market-breadth.repository';
import { MarketBreadthAggregate } from '../../../domain/entities/market-breadth-aggregate';
import { BreadthDate } from '../../../domain/value-objects/breadth-date';
import { MARKET_BREADTH_REPOSITORY } from '../../../constants/tokens';

describe('MarketBreadthRepository Integration', () => {
  let module: TestingModule;
  let repository: MarketBreadthRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        {
          provide: MARKET_BREADTH_REPOSITORY,
          useClass: MarketBreadthRepositoryImpl,
        },
      ],
    }).compile();

    await module.init();

    repository = module.get<MarketBreadthRepository>(MARKET_BREADTH_REPOSITORY);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM market_breadth_daily_aggregates');
    await databaseService.query(
      'DELETE FROM market_breadth_universe_membership',
    );
  });

  it('persists membership and reads it back', async () => {
    const date = BreadthDate.fromISOString('2026-08-31');
    await repository.saveMembership(date, ['AAPL', 'MSFT', 'NVDA']);

    const symbols = await repository.getMembership(date);
    expect(symbols.sort()).toEqual(['AAPL', 'MSFT', 'NVDA']);
  });

  it('is idempotent when saving membership for the same date twice', async () => {
    const date = BreadthDate.fromISOString('2026-08-31');
    await repository.saveMembership(date, ['AAPL', 'MSFT']);
    await repository.saveMembership(date, ['AAPL', 'MSFT']);

    const symbols = await repository.getMembership(date);
    expect(symbols).toHaveLength(2);
  });

  it('scopes membership by date', async () => {
    await repository.saveMembership(BreadthDate.fromISOString('2026-08-31'), [
      'AAPL',
    ]);
    await repository.saveMembership(BreadthDate.fromISOString('2026-09-01'), [
      'MSFT',
    ]);

    const symbols = await repository.getMembership(
      BreadthDate.fromISOString('2026-08-31'),
    );
    expect(symbols).toEqual(['AAPL']);
  });

  it('persists an aggregate and reads it back with the correct fields', async () => {
    const aggregate = MarketBreadthAggregate.create({
      date: BreadthDate.fromISOString('2026-08-31'),
      universeSize: 3400,
      newHighs: 120,
      newLows: 45,
      missingSymbols: ['ZZZZ'],
      partial: false,
      backfilled: false,
    });

    await repository.saveAggregate(aggregate);

    const [saved] = await repository.getRecentAggregates(1);
    expect(saved.date.toISOString()).toBe('2026-08-31');
    expect(saved.universeSize).toBe(3400);
    expect(saved.newHighs).toBe(120);
    expect(saved.newLows).toBe(45);
    expect(saved.missingSymbols).toEqual(['ZZZZ']);
    expect(saved.partial).toBe(false);
    expect(saved.backfilled).toBe(false);
    expect(saved.ratio).toBeCloseTo(120 / 165, 5);
  });

  it('upserts an aggregate for the same date (5-session recompute is idempotent)', async () => {
    const date = BreadthDate.fromISOString('2026-08-31');

    await repository.saveAggregate(
      MarketBreadthAggregate.create({
        date,
        universeSize: 3400,
        newHighs: 100,
        newLows: 50,
        missingSymbols: [],
        partial: false,
        backfilled: false,
      }),
    );

    await repository.saveAggregate(
      MarketBreadthAggregate.create({
        date,
        universeSize: 3410,
        newHighs: 110,
        newLows: 40,
        missingSymbols: ['AAPL'],
        partial: false,
        backfilled: false,
      }),
    );

    const aggregates = await repository.getRecentAggregates(10);
    expect(aggregates).toHaveLength(1);
    expect(aggregates[0].newHighs).toBe(110);
    expect(aggregates[0].newLows).toBe(40);
    expect(aggregates[0].missingSymbols).toEqual(['AAPL']);
  });

  it('returns recent aggregates newest first', async () => {
    for (const date of ['2026-08-28', '2026-08-29', '2026-08-31']) {
      await repository.saveAggregate(
        MarketBreadthAggregate.create({
          date: BreadthDate.fromISOString(date),
          universeSize: 100,
          newHighs: 1,
          newLows: 1,
          missingSymbols: [],
          partial: false,
          backfilled: false,
        }),
      );
    }

    const aggregates = await repository.getRecentAggregates(10);
    expect(aggregates.map((a) => a.date.toISOString())).toEqual([
      '2026-08-31',
      '2026-08-29',
      '2026-08-28',
    ]);
  });

  it('derives a null ratio when both counts are zero', async () => {
    await repository.saveAggregate(
      MarketBreadthAggregate.create({
        date: BreadthDate.fromISOString('2026-08-31'),
        universeSize: 0,
        newHighs: 0,
        newLows: 0,
        missingSymbols: [],
        partial: false,
        backfilled: false,
      }),
    );

    const [saved] = await repository.getRecentAggregates(1);
    expect(saved.ratio).toBeNull();
  });
});
