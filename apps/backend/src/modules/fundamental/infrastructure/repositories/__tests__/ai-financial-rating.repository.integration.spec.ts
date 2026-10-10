import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../../../../../config/database.service';
import { Symbol } from '../../../../../shared/value-objects/symbol';
import { AI_FINANCIAL_RATING_REPOSITORY } from '../../../constants/tokens';
import type { AiFinancialRatingRepository } from '../../../domain/repositories/ai-financial-rating.repository.interface';
import type { AiFinancialRating } from '../../../domain/services/ai-financial-rater';
import { AiFinancialRatingRepositoryImpl } from '../ai-financial-rating.repository';

const FINGERPRINT = 'a'.repeat(64);

const RATING: AiFinancialRating = {
  model: 'jev-latest',
  grade: 'B',
  gradeConfidence: 0.8,
  gradeProbabilities: { A: 0.1, B: 0.6, C: 0.2, D: 0.05, F: 0.05 },
  currentEarnings: { scorePercent: 75, confidence: 0.7, label: 'Solid' },
  annualEarnings: { scorePercent: 50, confidence: 0.6, label: 'Mixed' },
};

describe('AiFinancialRatingRepository Integration', () => {
  let module: TestingModule;
  let repository: AiFinancialRatingRepository;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [await ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        DatabaseService,
        {
          provide: AI_FINANCIAL_RATING_REPOSITORY,
          useClass: AiFinancialRatingRepositoryImpl,
        },
      ],
    }).compile();

    await module.init();

    repository = module.get<AiFinancialRatingRepository>(
      AI_FINANCIAL_RATING_REPOSITORY,
    );
    databaseService = module.get<DatabaseService>(DatabaseService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(async () => {
    await databaseService.query('DELETE FROM ai_financial_ratings');
  });

  it('round-trips a saved rating', async () => {
    await repository.save(Symbol.of('AAPL'), FINGERPRINT, RATING);

    const found = await repository.findByFingerprint(
      Symbol.of('AAPL'),
      FINGERPRINT,
    );

    expect(found).toEqual(RATING);
  });

  it('returns null for an unknown fingerprint', async () => {
    await repository.save(Symbol.of('AAPL'), FINGERPRINT, RATING);

    const found = await repository.findByFingerprint(
      Symbol.of('AAPL'),
      'b'.repeat(64),
    );

    expect(found).toBeNull();
  });

  it('keeps the first rating when the same symbol and fingerprint are saved twice', async () => {
    await repository.save(Symbol.of('AAPL'), FINGERPRINT, RATING);

    await expect(
      repository.save(Symbol.of('AAPL'), FINGERPRINT, {
        ...RATING,
        grade: 'F',
      }),
    ).resolves.toBeUndefined();

    const found = await repository.findByFingerprint(
      Symbol.of('AAPL'),
      FINGERPRINT,
    );
    expect(found).toEqual(RATING);
  });
});
