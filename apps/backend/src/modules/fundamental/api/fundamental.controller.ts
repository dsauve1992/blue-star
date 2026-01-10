import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { Symbol } from '../../market-data/domain/value-objects/symbol';
import { ComputeFinancialReportUseCase } from '../use-cases/compute-financial-report.use-case';
import { FundamentalApiMapper } from './fundamental-api.mapper';
import { ComputeFinancialReportApiResponseDto } from './fundamental-api.dto';

@Controller('fundamental')
export class FundamentalController {
  constructor(
    private readonly computeFinancialReportUseCase: ComputeFinancialReportUseCase,
    private readonly fundamentalApiMapper: FundamentalApiMapper,
  ) {}

  @Get('financial-report')
  @Public()
  async computeFinancialReport(
    @Query('symbol') symbol: string,
  ): Promise<ComputeFinancialReportApiResponseDto> {
    try {
      const symbolValueObject = Symbol.of(symbol);

      const request = {
        symbol: symbolValueObject,
      };

      const useCaseResponse =
        await this.computeFinancialReportUseCase.execute(request);
      return this.fundamentalApiMapper.mapComputeFinancialReportResponse(
        useCaseResponse,
      );
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
