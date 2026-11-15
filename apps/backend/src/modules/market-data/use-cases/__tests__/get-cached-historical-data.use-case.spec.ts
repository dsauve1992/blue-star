import { Test, TestingModule } from '@nestjs/testing';
import { GetCachedHistoricalDataUseCase } from '../get-cached-historical-data.use-case';
import { MarketDataService } from '../../domain/services/market-data.service';
import { CACHED_MARKET_DATA_SERVICE } from '../../constants/tokens';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { DateRange } from '../../../../shared/value-objects/date-range';

describe('GetCachedHistoricalDataUseCase', () => {
  let useCase: GetCachedHistoricalDataUseCase;
  let mockCachedMarketDataService: jest.Mocked<MarketDataService>;

  beforeEach(async () => {
    mockCachedMarketDataService = {
      getHistoricalData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCachedHistoricalDataUseCase,
        {
          provide: CACHED_MARKET_DATA_SERVICE,
          useValue: mockCachedMarketDataService,
        },
      ],
    }).compile();

    useCase = module.get(GetCachedHistoricalDataUseCase);
  });

  it('delegates to the cached service with the interval forwarded and wraps the result', async () => {
    const symbol = Symbol.of('AAPL');
    const dateRange = DateRange.of(
      new Date('2024-01-01'),
      new Date('2024-01-31'),
    );
    const historicalData = { symbol, dateRange, pricePoints: [] };
    mockCachedMarketDataService.getHistoricalData.mockResolvedValue(
      historicalData,
    );

    const result = await useCase.execute({
      symbol,
      dateRange,
      interval: '1wk',
    });

    expect(result).toEqual({ historicalData });
    expect(mockCachedMarketDataService.getHistoricalData).toHaveBeenCalledWith(
      symbol,
      dateRange,
      '1wk',
    );
  });
});
