import { Injectable, Inject } from '@nestjs/common';
import { Symbol } from '../domain/value-objects/symbol';
import { DateRange } from '../domain/value-objects/date-range';
import {
  HistoricalData,
  Interval,
  MarketDataService,
} from '../domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../constants/tokens';

export interface GetIntradayDataRequestDto {
  symbol: Symbol;
  dateRange: DateRange;
  interval: Interval;
  includeExtendedHours: boolean;
}

export interface GetIntradayDataResponseDto {
  historicalData: HistoricalData;
}

@Injectable()
export class GetIntradayDataUseCase {
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
  ) {}

  async execute(
    request: GetIntradayDataRequestDto,
  ): Promise<GetIntradayDataResponseDto> {
    const historicalData = await this.marketDataService.getHistoricalData(
      request.symbol,
      request.dateRange,
      request.interval,
      { includePrePost: request.includeExtendedHours },
    );

    return { historicalData };
  }
}
