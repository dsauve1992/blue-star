import { Injectable } from '@nestjs/common';
import { HistoricalData } from '../domain/services/market-data.service';
import {
  HistoricalDataApiDto,
  GetHistoricalDataApiResponseDto,
} from './market-data-api.dto';
import { GetHistoricalDataResponseDto } from '../use-cases/get-historical-data.use-case';

@Injectable()
export class MarketDataApiMapper {
  mapHistoricalDataToApiDto(
    historicalData: HistoricalData,
  ): HistoricalDataApiDto {
    return {
      symbol: historicalData.symbol.toString(),
      startDate: historicalData.dateRange.startDate.toISOString(),
      endDate: historicalData.dateRange.endDate.toISOString(),
      pricePoints: historicalData.pricePoints.map((point) => ({
        date: point.date.toISOString(),
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
      })),
    };
  }

  mapGetHistoricalDataResponse(
    useCaseResponse: GetHistoricalDataResponseDto,
  ): GetHistoricalDataApiResponseDto {
    return {
      historicalData: this.mapHistoricalDataToApiDto(
        useCaseResponse.historicalData,
      ),
    };
  }
}
