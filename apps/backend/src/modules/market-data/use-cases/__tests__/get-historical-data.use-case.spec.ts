import { Test, TestingModule } from '@nestjs/testing';
import { GetHistoricalDataUseCase } from '../get-historical-data.use-case';
import { MarketDataService } from '../../domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../constants/tokens';
import { Symbol } from '../../domain/value-objects/symbol';
import { DateRange } from '../../domain/value-objects/date-range';
import { PricePoint } from '../../domain/value-objects/price-point';

describe('GetHistoricalDataUseCase', () => {
  let useCase: GetHistoricalDataUseCase;
  let mockMarketDataService: jest.Mocked<MarketDataService>;

  beforeEach(async () => {
    mockMarketDataService = {
      getHistoricalData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetHistoricalDataUseCase,
        {
          provide: MARKET_DATA_SERVICE,
          useValue: mockMarketDataService,
        },
      ],
    }).compile();

    useCase = module.get<GetHistoricalDataUseCase>(GetHistoricalDataUseCase);
  });

  describe('execute', () => {
    it('should return historical data for valid symbol and date range', async () => {
      // Arrange
      const symbol = Symbol.of('AAPL');
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const dateRange = DateRange.of(startDate, endDate);

      const mockHistoricalData = {
        symbol,
        dateRange,
        pricePoints: [
          PricePoint.of(
            new Date('2024-01-01'),
            150.0,
            155.0,
            149.0,
            154.0,
            1000000,
          ),
          PricePoint.of(
            new Date('2024-01-02'),
            154.0,
            158.0,
            153.0,
            157.0,
            1200000,
          ),
        ],
      };

      mockMarketDataService.getHistoricalData.mockResolvedValue(
        mockHistoricalData,
      );

      const request = { symbol, dateRange };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.historicalData).toEqual(mockHistoricalData);
      expect(mockMarketDataService.getHistoricalData).toHaveBeenCalledWith(
        symbol,
        dateRange,
      );
    });

    it('should propagate service errors', async () => {
      // Arrange
      const symbol = Symbol.of('INVALID');
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const dateRange = DateRange.of(startDate, endDate);

      const serviceError = new Error('Invalid symbol: INVALID');
      mockMarketDataService.getHistoricalData.mockRejectedValue(serviceError);

      const request = { symbol, dateRange };

      // Act & Assert
      await expect(useCase.execute(request)).rejects.toThrow(serviceError);
    });
  });
});
