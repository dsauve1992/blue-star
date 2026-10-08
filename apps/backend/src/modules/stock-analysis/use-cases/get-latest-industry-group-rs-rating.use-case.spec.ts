import { Test } from '@nestjs/testing';
import { GetLatestIndustryGroupRsRatingUseCase } from './get-latest-industry-group-rs-rating.use-case';
import type { IndustryGroupRsRatingRepository } from '../domain/repositories/industry-group-rs-rating.repository.interface';
import { IndustryGroupRsRating } from '../domain/value-objects/industry-group-rs-rating';
import { INDUSTRY_GROUP_RS_RATING_REPOSITORY } from '../constants/tokens';

describe('GetLatestIndustryGroupRsRatingUseCase', () => {
  let useCase: GetLatestIndustryGroupRsRatingUseCase;
  let mockRepository: jest.Mocked<IndustryGroupRsRatingRepository>;

  beforeEach(async () => {
    mockRepository = {
      saveRatings: jest.fn(),
      getLatestRatings: jest.fn(),
      getLatestRating: jest.fn(),
      listLatestGroups: jest.fn(),
      getLatestRatingsByGroup: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        GetLatestIndustryGroupRsRatingUseCase,
        {
          provide: INDUSTRY_GROUP_RS_RATING_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get(GetLatestIndustryGroupRsRatingUseCase);
  });

  it('returns the rating number when found', async () => {
    mockRepository.getLatestRating.mockResolvedValue(
      IndustryGroupRsRating.of({
        symbol: 'NVDA',
        industryGroup: 'Semiconductors & Semiconductor Equipment',
        rsRating: 88,
        weightedScore: 1,
        groupSize: 25,
        computedAt: new Date('2026-06-20'),
      }),
    );

    await expect(useCase.execute('NVDA')).resolves.toBe(88);
    expect(mockRepository.getLatestRating).toHaveBeenCalledWith('NVDA');
  });

  it('returns null when the repository has no rating', async () => {
    mockRepository.getLatestRating.mockResolvedValue(null);

    await expect(useCase.execute('NVDA')).resolves.toBeNull();
  });
});
