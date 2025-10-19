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
import { MarketDataApiMapper } from './market-data-api.mapper';
import { GetHistoricalDataApiResponseDto } from './market-data-api.dto';

@Controller('market-data')
export class MarketDataController {
  constructor(
    private readonly getHistoricalDataUseCase: GetHistoricalDataUseCase,
    private readonly screenStocksUseCase: ScreenStocksUseCase,
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
}
