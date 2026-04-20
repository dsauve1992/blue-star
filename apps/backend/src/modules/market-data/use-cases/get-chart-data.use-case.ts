import { Injectable, Inject } from '@nestjs/common';
import {
  ChartDataService,
  ChartData,
  ChartInterval,
} from '../domain/services/chart-data.service';
import { CHART_DATA_SERVICE } from '../constants/tokens';

export interface GetChartDataRequestDto {
  symbol: string;
  exchange: string;
  interval: ChartInterval;
  bars: number;
  includeExtendedHours?: boolean;
}

export interface GetChartDataResponseDto {
  chartData: ChartData;
}

@Injectable()
export class GetChartDataUseCase {
  constructor(
    @Inject(CHART_DATA_SERVICE)
    private readonly chartDataService: ChartDataService,
  ) {}

  async execute(
    request: GetChartDataRequestDto,
  ): Promise<GetChartDataResponseDto> {
    const includeExtendedHours = request.includeExtendedHours ?? true;
    const chartData = await this.chartDataService.getChartData(
      request.symbol,
      request.exchange,
      request.interval,
      request.bars,
      includeExtendedHours,
    );

    return { chartData };
  }
}
