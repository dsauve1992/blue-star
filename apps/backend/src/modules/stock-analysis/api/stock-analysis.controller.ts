import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import {
  QueryConsolidationAnalysisAnalyzeUseCase,
  QueryConsolidationAnalysisRequestDto,
  QueryConsolidationAnalysisResponseDto,
} from '../use-cases/query-consolidation-analysis-analyze-use.case';
import {
  RunConsolidationAnalysisRequestDto,
  RunConsolidationAnalysisUseCase,
} from '../use-cases/run-consolidation-analysis.use-case';

@Controller('stock-analysis')
export class StockAnalysisController {
  constructor(
    private readonly analyzeConsolidationsUseCase: QueryConsolidationAnalysisAnalyzeUseCase,
    private readonly runConsolidationAnalysisUseCase: RunConsolidationAnalysisUseCase,
  ) {}

  @Get('consolidations')
  @Public()
  async analyzeConsolidations(
    @Query('type') type: 'daily' | 'weekly',
  ): Promise<QueryConsolidationAnalysisResponseDto> {
    try {
      if (!type || (type !== 'daily' && type !== 'weekly')) {
        throw new BadRequestException(
          'Type query parameter is required and must be either "daily" or "weekly"',
        );
      }

      const request: QueryConsolidationAnalysisRequestDto = {
        type,
      };

      return await this.analyzeConsolidationsUseCase.execute(request);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error(error);
      throw new BadRequestException(error);
    }
  }

  @Post('consolidations/run')
  @Public()
  async runConsolidationAnalysis(
    @Body() body: RunConsolidationAnalysisRequestDto,
  ): Promise<{ message: string }> {
    try {
      if (!body.type || (body.type !== 'daily' && body.type !== 'weekly')) {
        throw new BadRequestException(
          'Type is required and must be either "daily" or "weekly"',
        );
      }

      await this.runConsolidationAnalysisUseCase.execute(body);
      return { message: 'Analysis started successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error(error);
      throw new BadRequestException(error);
    }
  }
}
