import { Test, TestingModule } from '@nestjs/testing';
import { GetCompanyProfileUseCase } from '../get-company-profile.use-case';
import { CompanyProfileService } from '../../domain/services/company-profile.service';
import { COMPANY_PROFILE_SERVICE } from '../../constants/tokens';
import { Symbol } from '../../domain/value-objects/symbol';

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
    it('should return company profile for valid symbol', async () => {
      // Arrange
      const symbol = Symbol.of('AAPL');

      const mockProfile = {
        symbol: 'AAPL',
        sector: 'Technology',
        industry: 'Consumer Electronics',
      };

      mockCompanyProfileService.getCompanyProfile.mockResolvedValue(
        mockProfile,
      );

      const request = { symbol };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.profile).toEqual(mockProfile);
      expect(mockCompanyProfileService.getCompanyProfile).toHaveBeenCalledWith(
        symbol,
      );
    });

    it('should propagate service errors', async () => {
      // Arrange
      const symbol = Symbol.of('INVALID');

      const serviceError = new Error(
        'Failed to fetch company profile: No profile data found for symbol: INVALID',
      );
      mockCompanyProfileService.getCompanyProfile.mockRejectedValue(
        serviceError,
      );

      const request = { symbol };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(serviceError);
    });
  });
});
