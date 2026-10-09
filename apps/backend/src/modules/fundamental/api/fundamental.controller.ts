import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { Symbol } from '../../../shared/value-objects/symbol';
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
    let symbolValueObject: Symbol;
    try {
      symbolValueObject = Symbol.of(symbol);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid symbol',
      );
    }

    const useCaseResponse = await this.computeFinancialReportUseCase.execute({
      symbol: symbolValueObject,
    });
    return this.fundamentalApiMapper.mapComputeFinancialReportResponse(
      useCaseResponse,
    );
  }
}
