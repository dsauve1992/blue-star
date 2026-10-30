import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../../../../config/database.service';
import { MarketHealthRepository } from '../../../domain/repositories/market-health.repository.interface';
import { MarketHealthRepositoryImpl } from '../market-health.repository';
import { MarketHealth } from '../../../domain/entities/market-health.entity';
import { MarketHealthStatus } from '../../../domain/value-objects/market-health-status';
import { MARKET_HEALTH_REPOSITORY } from '../../../constants/tokens';

function makeMarketHealth(
  overrides: Partial<{
    status: MarketHealthStatus;
    ema9: number;
    ema21: number;
    computedAt: Date;
  }> = {},
): MarketHealth {
  return MarketHealth.create({
    id: randomUUID(),
    status: MarketHealthStatus.good(),
    ema9: 101.5,
    ema21: 100.25,
    computedAt: new Date('2026-03-10T21:00:00.000Z'),
    ...overrides,
  });
}

describe('MarketHealthRepository Integration', () => {
  let module: TestingModule;
  let repository: MarketHealthRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        {
          provide: MARKET_HEALTH_REPOSITORY,
          useClass: MarketHealthRepositoryImpl,
        },
      ],
    }).compile();

    await module.init();

    repository = module.get<MarketHealthRepository>(MARKET_HEALTH_REPOSITORY);
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM market_health_status');
  });

  it('returns null when the table is empty', async () => {
    expect(await repository.findLatest()).toBeNull();
  });

  it('round-trips status, numeric EMAs and computedAt', async () => {
    const saved = makeMarketHealth({
      status: MarketHealthStatus.warning(),
      ema9: 101.5,
      ema21: 100.25,
      computedAt: new Date('2026-03-10T21:00:00.000Z'),
    });

    await repository.save(saved);
    const found = await repository.findLatest();

    expect(found).not.toBeNull();
    expect(found!.id).toBe(saved.id);
    expect(found!.status).toEqual(saved.status);
    expect(found!.ema9).toBe(101.5);
    expect(found!.ema21).toBe(100.25);
    expect(found!.computedAt).toEqual(new Date('2026-03-10T21:00:00.000Z'));
  });

  it('returns the row with the latest computedAt regardless of insertion order', async () => {
    const middle = makeMarketHealth({
      computedAt: new Date('2026-03-10T21:00:00.000Z'),
    });
    const latest = makeMarketHealth({
      computedAt: new Date('2026-03-12T21:00:00.000Z'),
    });
    const oldest = makeMarketHealth({
      computedAt: new Date('2026-03-08T21:00:00.000Z'),
    });

    await repository.save(middle);
    await repository.save(latest);
    await repository.save(oldest);

    const found = await repository.findLatest();

    expect(found!.id).toBe(latest.id);
  });

  it.each([
    ['GOOD', MarketHealthStatus.good()],
    ['WARNING', MarketHealthStatus.warning()],
    ['BAD', MarketHealthStatus.bad()],
  ])('round-trips the %s status', async (_label, status) => {
    await repository.save(makeMarketHealth({ status }));

    const found = await repository.findLatest();

    expect(found!.status).toEqual(status);
  });
});
