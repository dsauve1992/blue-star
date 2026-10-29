import { Test, TestingModule } from '@nestjs/testing';
import { GetCompanyProfileUseCase } from '../get-company-profile.use-case';
import { CompanyProfileService } from '../../domain/services/company-profile.service';
import { COMPANY_PROFILE_SERVICE } from '../../constants/tokens';
import { Symbol } from '../../../../shared/value-objects/symbol';

describe('GetCompanyProfileUseCase', () => {
  let useCase: GetCompanyProfileUseCase;
  let mockCompanyProfileService: jest.Mocked<CompanyProfileService>;

  beforeEach(async () => {
    mockCompanyProfileService = {
      getCompanyProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCompanyProfileUseCase,
        {
          provide: COMPANY_PROFILE_SERVICE,
          useValue: mockCompanyProfileService,
        },
      ],
    }).compile();

    useCase = module.get<GetCompanyProfileUseCase>(GetCompanyProfileUseCase);
  });

  describe('execute', () => {
    it('should return the company profile', async () => {
      const symbol = Symbol.of('AAPL');
      const profile = {
        symbol: 'AAPL',
        sector: 'Technology',
        industry: 'Consumer Electronics',
      };
      mockCompanyProfileService.getCompanyProfile.mockResolvedValue(profile);

      const result = await useCase.execute({ symbol });

      expect(result.profile).toEqual(profile);
      expect(mockCompanyProfileService.getCompanyProfile).toHaveBeenCalledWith(
        symbol,
      );
    });

    it('should propagate service errors', async () => {
      const symbol = Symbol.of('INVALID');

      mockCompanyProfileService.getCompanyProfile.mockRejectedValue(
        new Error('No profile data found for symbol: INVALID'),
      );

      await expect(useCase.execute({ symbol })).rejects.toThrow(
        'No profile data found for symbol: INVALID',
      );
    });
  });
});
