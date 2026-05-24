import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../../../../config/database.service';
import { IndustryGroupRsRatingRepository } from '../../../domain/repositories/industry-group-rs-rating.repository.interface';
import { IndustryGroupRsRatingRepositoryImpl } from '../industry-group-rs-rating.repository';
import { IndustryGroupRsRating } from '../../../domain/value-objects/industry-group-rs-rating';
import { INDUSTRY_GROUP_RS_RATING_REPOSITORY } from '../../../constants/tokens';

describe('IndustryGroupRsRatingRepository Integration', () => {
  let module: TestingModule;
  let repository: IndustryGroupRsRatingRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        {
          provide: INDUSTRY_GROUP_RS_RATING_REPOSITORY,
          useClass: IndustryGroupRsRatingRepositoryImpl,
        },
      ],
    }).compile();

    await module.init();

    repository = module.get<IndustryGroupRsRatingRepository>(
      INDUSTRY_GROUP_RS_RATING_REPOSITORY,
    );
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM industry_group_rs_ratings');
  });

  it('persists ratings and reads back the latest set by symbol', async () => {
    const computedAt = new Date('2026-05-24');
    await repository.saveRatings([
      IndustryGroupRsRating.of({
        symbol: 'NVDA',
        industryGroup: 'Semiconductors & Semiconductor Equipment',
        rsRating: 95,
        weightedScore: 12.3456,
        groupSize: 42,
        computedAt,
      }),
      IndustryGroupRsRating.of({
        symbol: 'AMD',
        industryGroup: 'Semiconductors & Semiconductor Equipment',
        rsRating: 88,
        weightedScore: 9.5,
        groupSize: 42,
        computedAt,
      }),
    ]);

    const result = await repository.getLatestRatings(['NVDA', 'AMD']);
    expect(result).toHaveLength(2);

    const nvda = result.find((r) => r.symbol === 'NVDA')!;
    expect(nvda.rsRating).toBe(95);
    expect(nvda.industryGroup).toBe('Semiconductors & Semiconductor Equipment');
    expect(nvda.groupSize).toBe(42);
    expect(nvda.weightedScore).toBeCloseTo(12.3456, 4);
  });

  it('upserts on (symbol, computed_at) conflict', async () => {
    const computedAt = new Date('2026-05-24');
    const initial = IndustryGroupRsRating.of({
      symbol: 'NVDA',
      industryGroup: 'Semiconductors & Semiconductor Equipment',
      rsRating: 50,
      weightedScore: 5.0,
      groupSize: 30,
      computedAt,
    });
    await repository.saveRatings([initial]);

    const updated = IndustryGroupRsRating.of({
      symbol: 'NVDA',
      industryGroup: 'Semiconductors & Semiconductor Equipment',
      rsRating: 97,
      weightedScore: 15.0,
      groupSize: 42,
      computedAt,
    });
    await repository.saveRatings([updated]);

    const result = await repository.getLatestRating('NVDA');
    expect(result?.rsRating).toBe(97);
    expect(result?.groupSize).toBe(42);
  });

  it('returns only rows for the latest computed_at', async () => {
    await repository.saveRatings([
      IndustryGroupRsRating.of({
        symbol: 'NVDA',
        industryGroup: 'Semiconductors & Semiconductor Equipment',
        rsRating: 70,
        weightedScore: 4.0,
        groupSize: 30,
        computedAt: new Date('2026-05-17'),
      }),
      IndustryGroupRsRating.of({
        symbol: 'NVDA',
        industryGroup: 'Semiconductors & Semiconductor Equipment',
        rsRating: 95,
        weightedScore: 12.0,
        groupSize: 42,
        computedAt: new Date('2026-05-24'),
      }),
    ]);

    const result = await repository.getLatestRating('NVDA');
    expect(result?.rsRating).toBe(95);
  });

  it('returns null when no rating exists for a symbol', async () => {
    const result = await repository.getLatestRating('NOTFOUND');
    expect(result).toBeNull();
  });
});
