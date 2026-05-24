import { Test } from '@nestjs/testing';
import { RunIndustryGroupRsRatingsUseCase } from './run-industry-group-rs-ratings.use-case';
import { IndustryGroupRsRatingComputationService } from '../domain/services/industry-group-rs-rating-computation.service';
import { INDUSTRY_GROUP_RS_RATING_COMPUTATION_SERVICE } from '../constants/tokens';

describe('RunIndustryGroupRsRatingsUseCase', () => {
  let useCase: RunIndustryGroupRsRatingsUseCase;
  let mockService: jest.Mocked<IndustryGroupRsRatingComputationService>;

  beforeEach(async () => {
    mockService = {
      computeIndustryGroupRsRatings: jest.fn(),
    } as jest.Mocked<IndustryGroupRsRatingComputationService>;

    const module = await Test.createTestingModule({
      providers: [
        RunIndustryGroupRsRatingsUseCase,
        {
          provide: INDUSTRY_GROUP_RS_RATING_COMPUTATION_SERVICE,
          useValue: mockService,
        },
      ],
    }).compile();

    useCase = module.get(RunIndustryGroupRsRatingsUseCase);
  });

  it('delegates to the computation service', async () => {
    await useCase.execute();
    expect(mockService.computeIndustryGroupRsRatings).toHaveBeenCalledTimes(1);
  });
});
