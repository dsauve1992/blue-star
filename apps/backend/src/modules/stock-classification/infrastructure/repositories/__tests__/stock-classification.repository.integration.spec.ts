import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { StockClassificationRepository } from '../../../domain/repositories/stock-classification.repository.interface';
import { StockClassificationRepositoryImpl } from '../stock-classification.repository';
import { StockClassification } from '../../../domain/entities/stock-classification.entity';
import { STOCK_CLASSIFICATION_REPOSITORY } from '../../../constants/tokens';

function makeClassification(
  overrides: Partial<{
    ticker: string;
    sector: string | null;
    industry: string | null;
    industryKey: string | null;
    industryGroup: string | null;
    classifiedAt: Date;
  }> = {},
): StockClassification {
  return StockClassification.fromData({
    ticker: 'AAPL',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    industryKey: 'consumer-electronics',
    industryGroup: 'Technology Hardware',
    classifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

describe('StockClassificationRepository Integration', () => {
  let module: TestingModule;
  let repository: StockClassificationRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        {
          provide: STOCK_CLASSIFICATION_REPOSITORY,
          useClass: StockClassificationRepositoryImpl,
        },
      ],
    }).compile();

    await module.init();

    repository = module.get<StockClassificationRepository>(
      STOCK_CLASSIFICATION_REPOSITORY,
    );
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM stock_classification');
  });

  it('round-trips all fields including a NULL industryGroup', async () => {
    const full = makeClassification();
    const noGroup = makeClassification({
      ticker: 'NOGROUP',
      industryGroup: null,
    });

    await repository.save(full);
    await repository.save(noGroup);

    expect(await repository.findByTicker('AAPL')).toEqual(full);
    expect(await repository.findByTicker('NOGROUP')).toEqual(noGroup);
  });

  it('overwrites every column and moves classifiedAt forward when saving the same ticker twice', async () => {
    await repository.save(makeClassification());
    const updated = makeClassification({
      sector: 'Industrials',
      industry: 'Aerospace',
      industryKey: 'aerospace',
      industryGroup: 'Aerospace & Defense',
      classifiedAt: new Date('2026-02-01T00:00:00.000Z'),
    });

    await repository.save(updated);

    expect(await repository.findByTicker('AAPL')).toEqual(updated);
  });

  it('finds a row case-insensitively and returns null for an unknown ticker', async () => {
    const saved = makeClassification();
    await repository.save(saved);

    expect(await repository.findByTicker('aapl')).toEqual(saved);
    expect(await repository.findByTicker('UNKNOWN')).toBeNull();
  });

  describe('findGroupsForTickers', () => {
    it('maps tickers to groups, null for a NULL group, omitting unknown tickers', async () => {
      await repository.save(makeClassification());
      await repository.save(
        makeClassification({ ticker: 'NOGROUP', industryGroup: null }),
      );

      const groups = await repository.findGroupsForTickers([
        'aapl',
        'nogroup',
        'unknown',
      ]);

      expect(groups).toEqual(
        new Map<string, string | null>([
          ['AAPL', 'Technology Hardware'],
          ['NOGROUP', null],
        ]),
      );
    });

    it('returns an empty map without querying for empty input', async () => {
      const querySpy = jest.spyOn(databaseService, 'query');

      const groups = await repository.findGroupsForTickers([]);

      expect(groups.size).toBe(0);
      expect(querySpy).not.toHaveBeenCalled();
      querySpy.mockRestore();
    });
  });
});
