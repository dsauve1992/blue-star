import { Injectable, Inject } from '@nestjs/common';
import { MarketDataService } from '../domain/services/market-data.service';
import { CACHED_MARKET_DATA_SERVICE } from '../constants/tokens';
import {
  GetHistoricalDataRequestDto,
  GetHistoricalDataResponseDto,
} from './get-historical-data.use-case';

@Injectable()
export class GetCachedHistoricalDataUseCase {
  constructor(
    @Inject(CACHED_MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
  ) {}

  async execute(
    request: GetHistoricalDataRequestDto,
  ): Promise<GetHistoricalDataResponseDto> {
    const historicalData = await this.marketDataService.getHistoricalData(
      request.symbol,
      request.dateRange,
      request.interval,
    );

    return { historicalData };
  }
}
