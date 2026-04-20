import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { Symbol } from '../domain/value-objects/symbol';
import { DateRange } from '../domain/value-objects/date-range';
import { GetHistoricalDataUseCase } from '../use-cases/get-historical-data.use-case';
import {
  ScreenStocksRequestDto,
  ScreenStocksResponseDto,
  ScreenStocksUseCase,
} from '../use-cases/screen-stocks.use-case';
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
    private readonly screenStocksUseCase: ScreenStocksUseCase,
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

  @Get('screener')
  @Public()
  async screenStocks(
    @Query('marketCapMin') marketCapMin?: string,
    @Query('marketCapMax') marketCapMax?: string,
    @Query('priceMin') priceMin?: string,
    @Query('priceMax') priceMax?: string,
    @Query('volumeMin') volumeMin?: string,
    @Query('volumeMax') volumeMax?: string,
    @Query('betaMin') betaMin?: string,
    @Query('betaMax') betaMax?: string,
    @Query('sector') sector?: string,
    @Query('country') country?: string,
    @Query('exchange') exchange?: string,
    @Query('limit') limit?: string,
  ): Promise<ScreenStocksResponseDto> {
    try {
      const request: ScreenStocksRequestDto = {};

      if (marketCapMin) request.marketCapMin = parseFloat(marketCapMin);
      if (marketCapMax) request.marketCapMax = parseFloat(marketCapMax);
      if (priceMin) request.priceMin = parseFloat(priceMin);
      if (priceMax) request.priceMax = parseFloat(priceMax);
      if (volumeMin) request.volumeMin = parseInt(volumeMin, 10);
      if (volumeMax) request.volumeMax = parseInt(volumeMax, 10);
      if (betaMin) request.betaMin = parseFloat(betaMin);
      if (betaMax) request.betaMax = parseFloat(betaMax);
      if (sector) request.sector = sector;
      if (country) request.country = country;
      if (exchange) request.exchange = exchange;
      if (limit) request.limit = parseInt(limit, 10);

      return await this.screenStocksUseCase.execute(request);
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
