import { Test } from '@nestjs/testing';
import { QueryRsRatingsUseCase } from './query-rs-ratings.use-case';
import type { RsRatingRepository } from '../domain/repositories/rs-rating.repository.interface';
import type { IndustryGroupRsRatingRepository } from '../domain/repositories/industry-group-rs-rating.repository.interface';
import { RsRating } from '../domain/value-objects/rs-rating';
import { IndustryGroupRsRating } from '../domain/value-objects/industry-group-rs-rating';
import {
  INDUSTRY_GROUP_RS_RATING_REPOSITORY,
  RS_RATING_REPOSITORY,
} from '../constants/tokens';

describe('QueryRsRatingsUseCase', () => {
  let useCase: QueryRsRatingsUseCase;
  let mockRepository: jest.Mocked<RsRatingRepository>;
  let mockIndustryGroupRepository: jest.Mocked<IndustryGroupRsRatingRepository>;

  const computedAt = new Date('2026-06-20T00:00:00.000Z');

  const stockRating = (symbol: string) =>
    RsRating.of({ symbol, rsRating: 97, weightedScore: 1.5, computedAt });

  const groupRating = (
    symbol: string,
    industryGroup = 'Semiconductors & Semiconductor Equipment',
    rsRating = 91,
  ) =>
    IndustryGroupRsRating.of({
      symbol,
      industryGroup,
      rsRating,
      weightedScore: 8,
      groupSize: 30,
      computedAt,
    });

  beforeEach(async () => {
    mockRepository = {
      saveRatings: jest.fn(),
      getLatestRatings: jest.fn(),
      getLatestRating: jest.fn(),
      getAllForLatestDate: jest.fn(),
    };
    mockIndustryGroupRepository = {
      saveRatings: jest.fn(),
      getLatestRatings: jest.fn(),
      getLatestRating: jest.fn(),
      listLatestGroups: jest.fn(),
      getLatestRatingsByGroup: jest.fn(),
    } as jest.Mocked<IndustryGroupRsRatingRepository>;

    const module = await Test.createTestingModule({
      providers: [
        QueryRsRatingsUseCase,
        { provide: RS_RATING_REPOSITORY, useValue: mockRepository },
        {
          provide: INDUSTRY_GROUP_RS_RATING_REPOSITORY,
          useValue: mockIndustryGroupRepository,
        },
      ],
    }).compile();

    useCase = module.get(QueryRsRatingsUseCase);
  });

  it('joins each symbol to its own group rating regardless of order', async () => {
    mockRepository.getLatestRatings.mockResolvedValue([
      stockRating('NVDA'),
      stockRating('AMD'),
    ]);
    mockIndustryGroupRepository.getLatestRatings.mockResolvedValue([
      groupRating('AMD', 'Software', 70),
      groupRating('NVDA'),
    ]);

    const result = await useCase.execute({ symbols: ['NVDA', 'AMD'] });

    expect(result.ratings).toEqual([
      {
        symbol: 'NVDA',
        rsRating: 97,
        weightedScore: 1.5,
        computedAt: '2026-06-20',
        industryGroupRsRating: 91,
        industryGroup: 'Semiconductors & Semiconductor Equipment',
      },
      {
        symbol: 'AMD',
        rsRating: 97,
        weightedScore: 1.5,
        computedAt: '2026-06-20',
        industryGroupRsRating: 70,
        industryGroup: 'Software',
      },
    ]);
  });

  it('returns null group fields only for the symbol without a group rating', async () => {
    mockRepository.getLatestRatings.mockResolvedValue([
      stockRating('NVDA'),
      stockRating('AMD'),
    ]);
    mockIndustryGroupRepository.getLatestRatings.mockResolvedValue([
      groupRating('AMD', 'Software', 70),
    ]);

    const result = await useCase.execute({ symbols: ['NVDA', 'AMD'] });

    expect(result.ratings).toMatchObject([
      { symbol: 'NVDA', industryGroupRsRating: null, industryGroup: null },
      { symbol: 'AMD', industryGroupRsRating: 70, industryGroup: 'Software' },
    ]);
  });

  it('renders computedAt as YYYY-MM-DD', async () => {
    mockRepository.getLatestRatings.mockResolvedValue([
      RsRating.of({
        symbol: 'NVDA',
        rsRating: 97,
        weightedScore: 1.5,
        computedAt: new Date('2026-06-20T15:45:10.123Z'),
      }),
    ]);
    mockIndustryGroupRepository.getLatestRatings.mockResolvedValue([]);

    const result = await useCase.execute({ symbols: ['NVDA'] });

    expect(result.ratings[0].computedAt).toBe('2026-06-20');
  });

  it('requests the symbols from both repositories', async () => {
    mockRepository.getLatestRatings.mockResolvedValue([]);
    mockIndustryGroupRepository.getLatestRatings.mockResolvedValue([]);

    await useCase.execute({ symbols: ['NVDA', 'AMD'] });

    expect(mockRepository.getLatestRatings).toHaveBeenCalledWith([
      'NVDA',
      'AMD',
    ]);
    expect(mockIndustryGroupRepository.getLatestRatings).toHaveBeenCalledWith([
      'NVDA',
      'AMD',
    ]);
  });

  it('returns an empty list when there are no stock ratings', async () => {
    mockRepository.getLatestRatings.mockResolvedValue([]);
    mockIndustryGroupRepository.getLatestRatings.mockResolvedValue([
      groupRating('NVDA'),
    ]);

    await expect(useCase.execute({ symbols: ['NVDA'] })).resolves.toEqual({
      ratings: [],
    });
  });
});
