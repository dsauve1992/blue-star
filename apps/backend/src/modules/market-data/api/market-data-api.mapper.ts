import { Injectable } from '@nestjs/common';
import { HistoricalData } from '../domain/services/market-data.service';
import {
  HistoricalDataApiDto,
  GetHistoricalDataApiResponseDto,
  GetChartDataApiResponseDto,
} from './market-data-api.dto';
import { GetHistoricalDataResponseDto } from '../use-cases/get-historical-data.use-case';
import { GetChartDataResponseDto } from '../use-cases/get-chart-data.use-case';

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

  mapGetChartDataResponse(
    useCaseResponse: GetChartDataResponseDto,
  ): GetChartDataApiResponseDto {
    const { chartData } = useCaseResponse;
    const isDaily = ['D', 'W', 'M'].includes(chartData.interval);

    return {
      chartData: {
        symbol: chartData.symbol,
        exchange: chartData.exchange,
        interval: chartData.interval,
        candles: chartData.pricePoints.map((point) => ({
          time: isDaily
            ? point.date.toISOString().split('T')[0]
            : Math.floor(point.date.getTime() / 1000),
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: point.volume,
        })),
      },
    };
  }
}
