import { Injectable, Inject } from '@nestjs/common';
import { Symbol } from '../domain/value-objects/symbol';
import { DateRange } from '../domain/value-objects/date-range';
import {
  HistoricalData,
  MarketDataService,
} from '../domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../constants/tokens';

export interface GetHistoricalDataRequestDto {
  symbol: Symbol;
  dateRange: DateRange;
}

export interface GetHistoricalDataResponseDto {
  historicalData: HistoricalData;
}

@Injectable()
export class GetHistoricalDataUseCase {
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
  ) {}

  async execute(
    request: GetHistoricalDataRequestDto,
  ): Promise<GetHistoricalDataResponseDto> {
    const historicalData = await this.marketDataService.getHistoricalData(
      request.symbol,
      request.dateRange,
    );

    return { historicalData };
  }
}
