import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Symbol } from '../../../shared/value-objects/symbol';
import { DateRange } from '../../../shared/value-objects/date-range';
import { GetHistoricalDataUseCase } from '../use-cases/get-historical-data.use-case';
import { GetChartDataUseCase } from '../use-cases/get-chart-data.use-case';
import { GetIntradayDataUseCase } from '../use-cases/get-intraday-data.use-case';
import { MarketDataApiMapper } from './market-data-api.mapper';
import {
  GetHistoricalDataApiResponseDto,
  GetCompanyProfileApiResponseDto,
  GetChartDataApiResponseDto,
  GetIntradayDataApiResponseDto,
} from './market-data-api.dto';
import { GetCompanyProfileUseCase } from '../use-cases/get-company-profile.use-case';
import { ChartInterval } from '../domain/services/chart-data.service';
import {
  Interval,
  INTRADAY_INTERVALS,
  isIntradayInterval,
} from '../domain/services/market-data.service';

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

function parseSymbol(raw: string): Symbol {
  try {
    return Symbol.of(raw);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Invalid symbol',
    );
  }
}

function parseDateRange(start: string, end: string): DateRange {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new BadRequestException('Dates must be valid dates');
  }
  try {
    return DateRange.of(startDate, endDate);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Invalid date range',
    );
  }
}

function parseBars(raw: string): number {
  const bars = Number.parseInt(raw, 10);
  if (!Number.isFinite(bars) || bars < 1) {
    throw new BadRequestException('bars must be a positive integer');
  }
  return bars;
}

@Controller('market-data')
export class MarketDataController {
  constructor(
    private readonly getHistoricalDataUseCase: GetHistoricalDataUseCase,
    private readonly getCompanyProfileUseCase: GetCompanyProfileUseCase,
    private readonly getChartDataUseCase: GetChartDataUseCase,
    private readonly getIntradayDataUseCase: GetIntradayDataUseCase,
    private readonly marketDataApiMapper: MarketDataApiMapper,
  ) {}

  @Get('historical')
  async getHistoricalData(
    @Query('symbol') symbol: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<GetHistoricalDataApiResponseDto> {
    const request = {
      symbol: parseSymbol(symbol),
      dateRange: parseDateRange(startDate, endDate),
    };

    const useCaseResponse =
      await this.getHistoricalDataUseCase.execute(request);
    return this.marketDataApiMapper.mapGetHistoricalDataResponse(
      useCaseResponse,
    );
  }

  @Get('profile')
  async getCompanyProfile(
    @Query('symbol') symbol: string,
  ): Promise<GetCompanyProfileApiResponseDto> {
    const response = await this.getCompanyProfileUseCase.execute({
      symbol: parseSymbol(symbol),
    });
    return { profile: response.profile };
  }

  @Get('chart')
  async getChartData(
    @Query('symbol') symbol: string,
    @Query('exchange') exchange: string,
    @Query('interval') interval: string = 'D',
    @Query('bars') bars: string = '200',
    @Query('includeExtendedHours') includeExtendedHours?: string,
  ): Promise<GetChartDataApiResponseDto> {
    if (!VALID_CHART_INTERVALS.includes(interval as ChartInterval)) {
      throw new BadRequestException(
        `Invalid interval: ${interval}. Must be one of: ${VALID_CHART_INTERVALS.join(', ')}`,
      );
    }

    const response = await this.getChartDataUseCase.execute({
      symbol,
      exchange,
      interval: interval as ChartInterval,
      bars: parseBars(bars),
      includeExtendedHours: parseIncludeExtendedHours(includeExtendedHours),
    });

    return this.marketDataApiMapper.mapGetChartDataResponse(response);
  }

  @Get('intraday')
  async getIntradayData(
    @Query('symbol') symbol: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('interval') interval: string = '5m',
    @Query('includeExtendedHours') includeExtendedHours?: string,
  ): Promise<GetIntradayDataApiResponseDto> {
    if (!isIntradayInterval(interval as Interval)) {
      throw new BadRequestException(
        `Invalid interval: ${interval}. Must be one of: ${INTRADAY_INTERVALS.join(', ')}`,
      );
    }

    const request = {
      symbol: parseSymbol(symbol),
      dateRange: parseDateRange(startDate, endDate),
      interval: interval as Interval,
      includeExtendedHours:
        includeExtendedHours == null
          ? false
          : parseIncludeExtendedHours(includeExtendedHours),
    };

    const useCaseResponse = await this.getIntradayDataUseCase.execute(request);
    return this.marketDataApiMapper.mapGetIntradayDataResponse(useCaseResponse);
  }
}
