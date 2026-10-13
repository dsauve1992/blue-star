import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { Symbol } from '../../../shared/value-objects/symbol';
import { ComputeFinancialReportUseCase } from '../use-cases/compute-financial-report.use-case';
import { GetEarningsExpectationsUseCase } from '../use-cases/get-earnings-expectations.use-case';
import { FundamentalApiMapper } from './fundamental-api.mapper';
import {
  ComputeFinancialReportApiResponseDto,
  GetEarningsExpectationsApiResponseDto,
} from './fundamental-api.dto';

@Controller('fundamental')
export class FundamentalController {
  constructor(
    private readonly computeFinancialReportUseCase: ComputeFinancialReportUseCase,
    private readonly getEarningsExpectationsUseCase: GetEarningsExpectationsUseCase,
    private readonly fundamentalApiMapper: FundamentalApiMapper,
  ) {}

  @Get('financial-report')
  @Public()
  async computeFinancialReport(
    @Query('symbol') symbol: string,
  ): Promise<ComputeFinancialReportApiResponseDto> {
    const useCaseResponse = await this.computeFinancialReportUseCase.execute({
      symbol: parseSymbol(symbol),
    });
    return this.fundamentalApiMapper.mapComputeFinancialReportResponse(
      useCaseResponse,
    );
  }

  @Get('expectations')
  @Public()
  async getEarningsExpectations(
    @Query('symbol') symbol: string,
  ): Promise<GetEarningsExpectationsApiResponseDto> {
    const useCaseResponse = await this.getEarningsExpectationsUseCase.execute({
      symbol: parseSymbol(symbol),
    });
    return this.fundamentalApiMapper.mapGetEarningsExpectationsResponse(
      useCaseResponse,
    );
  }
}

function parseSymbol(symbol: string): Symbol {
  try {
    return Symbol.of(symbol);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Invalid symbol',
    );
  }
}
