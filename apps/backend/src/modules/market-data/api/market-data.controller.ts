import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { Symbol } from '../domain/value-objects/symbol';
import { DateRange } from '../domain/value-objects/date-range';
import { GetHistoricalDataUseCase } from '../use-cases/get-historical-data.use-case';
import { MarketDataApiMapper } from './market-data-api.mapper';
import { GetHistoricalDataApiResponseDto } from './market-data-api.dto';

@Controller('market-data')
export class MarketDataController {
  constructor(
    private readonly getHistoricalDataUseCase: GetHistoricalDataUseCase,
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
      throw new BadRequestException(error.message);
    }
  }
}
