import { Test, TestingModule } from '@nestjs/testing';
import { GetCompanyProfileUseCase } from '../get-company-profile.use-case';
import { CompanyProfileService } from '../../domain/services/company-profile.service';
import { COMPANY_PROFILE_SERVICE } from '../../constants/tokens';
import { Symbol } from '../../domain/value-objects/symbol';
import { GetOrFetchStockClassificationUseCase } from '../../../stock-classification/use-cases/get-or-fetch-stock-classification.use-case';
import { StockClassification } from '../../../stock-classification/domain/entities/stock-classification.entity';

describe('GetCompanyProfileUseCase', () => {
  let useCase: GetCompanyProfileUseCase;
  let mockCompanyProfileService: jest.Mocked<CompanyProfileService>;
  let mockClassificationUseCase: jest.Mocked<GetOrFetchStockClassificationUseCase>;

  beforeEach(async () => {
    mockCompanyProfileService = {
      getCompanyProfile: jest.fn(),
    };

    mockClassificationUseCase = {
      execute: jest.fn(),
      executeMany: jest.fn(),
    } as unknown as jest.Mocked<GetOrFetchStockClassificationUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCompanyProfileUseCase,
        {
          provide: COMPANY_PROFILE_SERVICE,
          useValue: mockCompanyProfileService,
        },
        {
          provide: GetOrFetchStockClassificationUseCase,
          useValue: mockClassificationUseCase,
        },
      ],
    }).compile();

    useCase = module.get<GetCompanyProfileUseCase>(GetCompanyProfileUseCase);
  });

  describe('execute', () => {
    it('should return company profile enriched with industry group', async () => {
      const symbol = Symbol.of('AAPL');

      mockCompanyProfileService.getCompanyProfile.mockResolvedValue({
        symbol: 'AAPL',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        industryGroup: null,
      });

      mockClassificationUseCase.execute.mockResolvedValue(
        StockClassification.create({
          ticker: 'AAPL',
          sector: 'Technology',
          industry: 'Consumer Electronics',
          industryKey: 'consumer-electronics',
          industryGroup: 'Technology Hardware & Equipment',
        }),
      );

      const result = await useCase.execute({ symbol });

      expect(result.profile.industryGroup).toBe(
        'Technology Hardware & Equipment',
      );
      expect(mockCompanyProfileService.getCompanyProfile).toHaveBeenCalledWith(
        symbol,
      );
      expect(mockClassificationUseCase.execute).toHaveBeenCalledWith('AAPL');
    });

    it('should fall back to null industry group when classification fails', async () => {
      const symbol = Symbol.of('AAPL');

      mockCompanyProfileService.getCompanyProfile.mockResolvedValue({
        symbol: 'AAPL',
        sector: 'Technology',
        industry: 'Consumer Electronics',
        industryGroup: null,
      });

      mockClassificationUseCase.execute.mockRejectedValue(
        new Error('classifier offline'),
      );

      const result = await useCase.execute({ symbol });

      expect(result.profile.industryGroup).toBeNull();
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
