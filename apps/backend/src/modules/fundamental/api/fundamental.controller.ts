import {
  BadRequestException,
  Controller,
  Get,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { Symbol } from '../../../shared/value-objects/symbol';
import { ComputeFinancialReportUseCase } from '../use-cases/compute-financial-report.use-case';
import { FundamentalApiMapper } from './fundamental-api.mapper';
import {
  ComputeFinancialReportApiResponseDto,
  RateFinancialsWithAiApiResponseDto,
} from './fundamental-api.dto';
import { RateFinancialsWithAiUseCase } from '../use-cases/rate-financials-with-ai.use-case';
import { AiRaterUnavailableError } from '../domain/services/ai-financial-rater';

@Controller('fundamental')
export class FundamentalController {
  constructor(
    private readonly computeFinancialReportUseCase: ComputeFinancialReportUseCase,
    private readonly fundamentalApiMapper: FundamentalApiMapper,
    private readonly rateFinancialsWithAiUseCase: RateFinancialsWithAiUseCase,
  ) {}

  @Get('financial-report')
  @Public()
  async computeFinancialReport(
    @Query('symbol') symbol: string,
  ): Promise<ComputeFinancialReportApiResponseDto> {
    const symbolValueObject = this.parseSymbol(symbol);
    const useCaseResponse = await this.computeFinancialReportUseCase.execute({
      symbol: symbolValueObject,
    });
    return this.fundamentalApiMapper.mapComputeFinancialReportResponse(
      useCaseResponse,
    );
  }

  @Get('ai-rating')
  async rateFinancialsWithAi(
    @Query('symbol') symbol: string,
  ): Promise<RateFinancialsWithAiApiResponseDto> {
    const symbolValueObject = this.parseSymbol(symbol);
    try {
      const useCaseResponse = await this.rateFinancialsWithAiUseCase.execute({
        symbol: symbolValueObject,
      });
      return this.fundamentalApiMapper.mapRateFinancialsWithAiResponse(
        useCaseResponse,
      );
    } catch (error) {
      if (error instanceof AiRaterUnavailableError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }
  }

  private parseSymbol(symbol: string): Symbol {
    try {
      return Symbol.of(symbol);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid symbol',
      );
    }
  }
}
