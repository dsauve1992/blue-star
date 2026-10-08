import { Test } from '@nestjs/testing';
import { GetLatestRsRatingUseCase } from './get-latest-rs-rating.use-case';
import type { RsRatingRepository } from '../domain/repositories/rs-rating.repository.interface';
import { RsRating } from '../domain/value-objects/rs-rating';
import { RS_RATING_REPOSITORY } from '../constants/tokens';

describe('GetLatestRsRatingUseCase', () => {
  let useCase: GetLatestRsRatingUseCase;
  let mockRepository: jest.Mocked<RsRatingRepository>;

  beforeEach(async () => {
    mockRepository = {
      saveRatings: jest.fn(),
      getLatestRatings: jest.fn(),
      getLatestRating: jest.fn(),
      getAllForLatestDate: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        GetLatestRsRatingUseCase,
        { provide: RS_RATING_REPOSITORY, useValue: mockRepository },
      ],
    }).compile();

    useCase = module.get(GetLatestRsRatingUseCase);
  });

  it('returns the rating number when found', async () => {
    mockRepository.getLatestRating.mockResolvedValue(
      RsRating.of({
        symbol: 'NVDA',
        rsRating: 97,
        weightedScore: 1,
        computedAt: new Date('2026-06-20'),
      }),
    );

    await expect(useCase.execute('NVDA')).resolves.toBe(97);
    expect(mockRepository.getLatestRating).toHaveBeenCalledWith('NVDA');
  });

  it('returns null when the repository has no rating', async () => {
    mockRepository.getLatestRating.mockResolvedValue(null);

    await expect(useCase.execute('NVDA')).resolves.toBeNull();
  });
});
