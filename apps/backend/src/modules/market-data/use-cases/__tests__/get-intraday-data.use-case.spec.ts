import { Test, TestingModule } from '@nestjs/testing';
import { GetIntradayDataUseCase } from '../get-intraday-data.use-case';
import { MarketDataService } from '../../domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../constants/tokens';
import { Symbol } from '../../domain/value-objects/symbol';
import { DateRange } from '../../domain/value-objects/date-range';
import { PricePoint } from '../../domain/value-objects/price-point';

describe('GetIntradayDataUseCase', () => {
  let useCase: GetIntradayDataUseCase;
  let mockMarketDataService: jest.Mocked<MarketDataService>;

  beforeEach(async () => {
    mockMarketDataService = {
      getHistoricalData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetIntradayDataUseCase,
        {
          provide: MARKET_DATA_SERVICE,
          useValue: mockMarketDataService,
        },
      ],
    }).compile();

    useCase = module.get<GetIntradayDataUseCase>(GetIntradayDataUseCase);
  });

  describe('execute', () => {
    it('should return intraday data for valid symbol, date range and interval', async () => {
      const symbol = Symbol.of('AAPL');
      const startDate = new Date('2024-01-02T14:30:00Z');
      const endDate = new Date('2024-01-02T21:00:00Z');
      const dateRange = DateRange.of(startDate, endDate);

      const mockHistoricalData = {
        symbol,
        dateRange,
        pricePoints: [
          PricePoint.of(
            new Date('2024-01-02T14:30:00Z'),
            150.0,
            150.5,
            149.8,
            150.2,
            10000,
          ),
          PricePoint.of(
            new Date('2024-01-02T14:35:00Z'),
            150.2,
            150.7,
            150.0,
            150.6,
            12000,
          ),
        ],
      };

      mockMarketDataService.getHistoricalData.mockResolvedValue(
        mockHistoricalData,
      );

      const request = {
        symbol,
        dateRange,
        interval: '5m' as const,
        includeExtendedHours: false,
      };

      const result = await useCase.execute(request);

      expect(result.historicalData).toEqual(mockHistoricalData);
      expect(mockMarketDataService.getHistoricalData).toHaveBeenCalledWith(
        symbol,
        dateRange,
        '5m',
        { includePrePost: false },
      );
    });

    it('should pass includeExtendedHours through as includePrePost', async () => {
      const symbol = Symbol.of('AAPL');
      const startDate = new Date('2024-01-02T14:30:00Z');
      const endDate = new Date('2024-01-02T21:00:00Z');
      const dateRange = DateRange.of(startDate, endDate);

      const mockHistoricalData = {
        symbol,
        dateRange,
        pricePoints: [],
      };

      mockMarketDataService.getHistoricalData.mockResolvedValue(
        mockHistoricalData,
      );

      const request = {
        symbol,
        dateRange,
        interval: '5m' as const,
        includeExtendedHours: true,
      };

      const result = await useCase.execute(request);

      expect(result.historicalData.pricePoints).toEqual([]);
      expect(mockMarketDataService.getHistoricalData).toHaveBeenCalledWith(
        symbol,
        dateRange,
        '5m',
        { includePrePost: true },
      );
    });

    it('should propagate service errors', async () => {
      const symbol = Symbol.of('INVALID');
      const startDate = new Date('2024-01-02T14:30:00Z');
      const endDate = new Date('2024-01-02T21:00:00Z');
      const dateRange = DateRange.of(startDate, endDate);

      const serviceError = new Error('Invalid symbol: INVALID');
      mockMarketDataService.getHistoricalData.mockRejectedValue(serviceError);

      const request = {
        symbol,
        dateRange,
        interval: '5m' as const,
        includeExtendedHours: false,
      };

      await expect(useCase.execute(request)).rejects.toThrow(serviceError);
    });
  });
});
