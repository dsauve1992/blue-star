import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Symbol } from '../domain/value-objects/symbol';
import { DateRange } from '../domain/value-objects/date-range';
import { GetHistoricalDataUseCase } from '../use-cases/get-historical-data.use-case';
import { GetChartDataUseCase } from '../use-cases/get-chart-data.use-case';
import { MarketDataApiMapper } from './market-data-api.mapper';
import {
  GetHistoricalDataApiResponseDto,
  GetCompanyProfileApiResponseDto,
  GetChartDataApiResponseDto,
} from './market-data-api.dto';
import { GetCompanyProfileUseCase } from '../use-cases/get-company-profile.use-case';
import { ChartInterval } from '../domain/services/chart-data.service';

const VALID_CHART_INTERVALS: ChartInterval[] = [
  '1',
  '5',
  '15',
  '30',
  '60',
  'D',
  'W',
  'M',
];

function parseIncludeExtendedHours(raw?: string): boolean {
  if (raw == null || raw === '') return true;
  const v = raw.toLowerCase();
  if (v === 'false' || v === '0' || v === 'no') return false;
  if (v === 'true' || v === '1' || v === 'yes') return true;
  return true;
}

@Controller('market-data')
export class MarketDataController {
  constructor(
    private readonly getHistoricalDataUseCase: GetHistoricalDataUseCase,
    private readonly getCompanyProfileUseCase: GetCompanyProfileUseCase,
    private readonly getChartDataUseCase: GetChartDataUseCase,
    private readonly marketDataApiMapper: MarketDataApiMapper,
  ) {}

  @Get('historical')
  async getHistoricalData(
    @Query('symbol') symbol: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<GetHistoricalDataApiResponseDto> {
    try {
      const symbolValueObject = Symbol.of(symbol);
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const dateRange = DateRange.of(startDateObj, endDateObj);

      const request = {
        symbol: symbolValueObject,
        dateRange,
      };

      const useCaseResponse =
        await this.getHistoricalDataUseCase.execute(request);
      return this.marketDataApiMapper.mapGetHistoricalDataResponse(
        useCaseResponse,
      );
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get('profile')
  async getCompanyProfile(
    @Query('symbol') symbol: string,
  ): Promise<GetCompanyProfileApiResponseDto> {
    try {
      const symbolValueObject = Symbol.of(symbol);
      const response = await this.getCompanyProfileUseCase.execute({
        symbol: symbolValueObject,
      });
      return { profile: response.profile };
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get('chart')
  async getChartData(
    @Query('symbol') symbol: string,
    @Query('exchange') exchange: string,
    @Query('interval') interval: string = 'D',
    @Query('bars') bars: string = '200',
    @Query('includeExtendedHours') includeExtendedHours?: string,
  ): Promise<GetChartDataApiResponseDto> {
    try {
      if (!VALID_CHART_INTERVALS.includes(interval as ChartInterval)) {
        throw new Error(
          `Invalid interval: ${interval}. Must be one of: ${VALID_CHART_INTERVALS.join(', ')}`,
        );
      }

      const response = await this.getChartDataUseCase.execute({
        symbol,
        exchange,
        interval: interval as ChartInterval,
        bars: parseInt(bars, 10),
        includeExtendedHours: parseIncludeExtendedHours(includeExtendedHours),
      });

      return this.marketDataApiMapper.mapGetChartDataResponse(response);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
