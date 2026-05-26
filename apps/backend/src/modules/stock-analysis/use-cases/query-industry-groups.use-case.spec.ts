import { Test } from '@nestjs/testing';
import { QueryIndustryGroupsUseCase } from './query-industry-groups.use-case';
import { IndustryGroupRsRatingRepository } from '../domain/repositories/industry-group-rs-rating.repository.interface';
import { INDUSTRY_GROUP_RS_RATING_REPOSITORY } from '../constants/tokens';

describe('QueryIndustryGroupsUseCase', () => {
  let useCase: QueryIndustryGroupsUseCase;
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
        QueryIndustryGroupsUseCase,
        {
          provide: INDUSTRY_GROUP_RS_RATING_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get(QueryIndustryGroupsUseCase);
  });

  it('returns groups with formatted computedAt date', async () => {
    mockRepository.listLatestGroups.mockResolvedValue([
      {
        industryGroup: 'Banks',
        memberCount: 20,
        computedAt: new Date('2026-05-24T00:00:00.000Z'),
      },
      {
        industryGroup: 'Semiconductors & Semiconductor Equipment',
        memberCount: 30,
        computedAt: new Date('2026-05-24T00:00:00.000Z'),
      },
    ]);

    const result = await useCase.execute();

    expect(result.groups).toEqual([
      {
        industryGroup: 'Banks',
        memberCount: 20,
        computedAt: '2026-05-24',
      },
      {
        industryGroup: 'Semiconductors & Semiconductor Equipment',
        memberCount: 30,
        computedAt: '2026-05-24',
      },
    ]);
  });

  it('returns empty list when repository has no groups', async () => {
    mockRepository.listLatestGroups.mockResolvedValue([]);
    const result = await useCase.execute();
    expect(result.groups).toEqual([]);
  });
});
