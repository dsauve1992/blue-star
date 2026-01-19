import { Inject, Injectable } from '@nestjs/common';
import { ConsolidationResultRepository } from '../domain/repositories/consolidation-result.repository.interface';
import { ConsolidationResult } from '../domain/value-objects/consolidation-result';
import { AnalysisDate } from '../domain/value-objects/analysis-date';
import { ConsolidationRunStatus } from '../domain/value-objects/consolidation-run-status';
import { CONSOLIDATION_RESULT_REPOSITORY } from '../constants/tokens';
import { ThemeRepository } from '../../themes/domain/repositories/theme.repository.interface';
import { THEME_REPOSITORY } from '../../themes/constants/tokens';

export interface QueryConsolidationAnalysisRequestDto {
  type: 'daily' | 'weekly';
}

export interface QueryConsolidationAnalysisResponseDto {
  daily: ConsolidationResult[];
  weekly: ConsolidationResult[];
  dailyCount: number;
  weeklyCount: number;
  hasData: boolean;
  runStatus?: 'completed' | 'running' | 'failed' | 'not_found';
  errorMessage?: string;
}

@Injectable()
export class QueryConsolidationAnalysisAnalyzeUseCase {
  constructor(
    @Inject(CONSOLIDATION_RESULT_REPOSITORY)
    private readonly repository: ConsolidationResultRepository,
    @Inject(THEME_REPOSITORY)
    private readonly themeRepository: ThemeRepository,
  ) {}

  async execute(
    request: QueryConsolidationAnalysisRequestDto,
  ): Promise<QueryConsolidationAnalysisResponseDto> {
    const analysisDate =
      request.type === 'daily'
        ? AnalysisDate.today()
        : AnalysisDate.forWeekly(new Date());

    const results = await this.repository.getLatestResults(
      request.type,
      analysisDate,
    );

    const consolidationResults: ConsolidationResult[] = await Promise.all(
      results.map(async (r) => {
        const themes = await this.themeRepository.findThemesByTicker(r.symbol);
        const themeNames = themes.map((theme) => theme.name);

        return ConsolidationResult.of({
          symbol: r.symbol,
          isNew: r.isNew,
          tickerFullName: r.tickerFullName,
          timeframe: r.timeframe,
          themes: themeNames,
          sector: r.sector ?? undefined,
          industry: r.industry ?? undefined,
        });
      }),
    );

    const hasData = results.length > 0;

    let runStatus: 'completed' | 'running' | 'failed' | 'not_found' | undefined;
    let errorMessage: string | undefined;
    const run = await this.repository.getLatestRun(request.type, analysisDate);

    if (run) {
      if (run.status === ConsolidationRunStatus.COMPLETED) {
        runStatus = 'completed';
      } else if (run.status === ConsolidationRunStatus.RUNNING) {
        runStatus = 'running';
      } else if (run.status === ConsolidationRunStatus.FAILED) {
        runStatus = 'failed';
        errorMessage = run.errorMessage;
      }
    } else {
      runStatus = 'not_found';
    }

    return {
      daily: request.type === 'daily' ? consolidationResults : [],
      weekly: request.type === 'weekly' ? consolidationResults : [],
      dailyCount: request.type === 'daily' ? consolidationResults.length : 0,
      weeklyCount: request.type === 'weekly' ? consolidationResults.length : 0,
      hasData,
      runStatus,
      errorMessage,
    };
  }
}
