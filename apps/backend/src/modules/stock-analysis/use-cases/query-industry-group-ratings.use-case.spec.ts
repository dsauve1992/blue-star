import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QueryIndustryGroupRatingsUseCase } from './query-industry-group-ratings.use-case';
import { IndustryGroupRsRatingRepository } from '../domain/repositories/industry-group-rs-rating.repository.interface';
import { IndustryGroupRsRating } from '../domain/value-objects/industry-group-rs-rating';
import { INDUSTRY_GROUP_RS_RATING_REPOSITORY } from '../constants/tokens';

describe('QueryIndustryGroupRatingsUseCase', () => {
  let useCase: QueryIndustryGroupRatingsUseCase;
  let mockRepository: jest.Mocked<IndustryGroupRsRatingRepository>;

  beforeEach(async () => {
    mockRepository = {
      saveRatings: jest.fn(),
      getLatestRatings: jest.fn(),
      getLatestRating: jest.fn(),
      listLatestGroups: jest.fn(),
      getLatestRatingsByGroup: jest.fn(),
    } as jest.Mocked<IndustryGroupRsRatingRepository>;

    const module = await Test.createTestingModule({
      providers: [
        QueryIndustryGroupRatingsUseCase,
        {
          provide: INDUSTRY_GROUP_RS_RATING_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get(QueryIndustryGroupRatingsUseCase);
  });

  it('returns ratings ordered as the repository provides and a single computedAt label', async () => {
    const computedAt = new Date('2026-05-24T00:00:00.000Z');
    mockRepository.getLatestRatingsByGroup.mockResolvedValue([
      IndustryGroupRsRating.of({
        symbol: 'NVDA',
        industryGroup: 'Semiconductors & Semiconductor Equipment',
        rsRating: 95,
        weightedScore: 12,
        groupSize: 30,
        computedAt,
      }),
      IndustryGroupRsRating.of({
        symbol: 'AMD',
        industryGroup: 'Semiconductors & Semiconductor Equipment',
        rsRating: 88,
        weightedScore: 9,
        groupSize: 30,
        computedAt,
      }),
    ]);

    const result = await useCase.execute({
      industryGroup: 'Semiconductors & Semiconductor Equipment',
    });

    expect(result.industryGroup).toBe(
      'Semiconductors & Semiconductor Equipment',
    );
    expect(result.computedAt).toBe('2026-05-24');
    expect(result.ratings).toEqual([
      { symbol: 'NVDA', rsRating: 95, weightedScore: 12, groupSize: 30 },
      { symbol: 'AMD', rsRating: 88, weightedScore: 9, groupSize: 30 },
    ]);
  });

  it('throws NotFoundException when the group has no ratings', async () => {
    mockRepository.getLatestRatingsByGroup.mockResolvedValue([]);
    await expect(
      useCase.execute({ industryGroup: 'Unknown' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
