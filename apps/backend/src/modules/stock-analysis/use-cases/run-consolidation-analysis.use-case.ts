import { Inject, Injectable } from '@nestjs/common';
import { ConsolidationAnalysisService } from '../domain/services/consolidation-analysis.service';
import { AnalysisDate } from '../domain/value-objects/analysis-date';
import { CONSOLIDATION_ANALYSIS_SERVICE } from '../constants/tokens';

export interface RunConsolidationAnalysisRequestDto {
  type: 'daily' | 'weekly';
}

@Injectable()
export class RunConsolidationAnalysisUseCase {
  constructor(
    @Inject(CONSOLIDATION_ANALYSIS_SERVICE)
    private readonly analysisService: ConsolidationAnalysisService,
  ) {}

  async execute(request: RunConsolidationAnalysisRequestDto): Promise<void> {
    const analysisDate =
      request.type === 'daily'
        ? AnalysisDate.today()
        : AnalysisDate.forWeekly(new Date());

    await this.analysisService.runAnalysis(request.type, analysisDate);
  }
}
